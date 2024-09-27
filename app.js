const { MongoClient } = require('mongodb');

// URL kết nối MongoDB
const url = 'mongodb://localhost:27017';
const dbName = 'phongkham';

async function main() {
    const client = new MongoClient(url);

    try {
        // Kết nối tới MongoDB
        await client.connect();
        console.log('Connected successfully to server');
        const db = client.db(dbName);

        // Gọi các hàm thực hiện truy vấn=
        await listDiseasesByMonth(db);
        await calculateDoctorSalary(db);
        await calculateNurseSalary(db);
        await showPatientHistory(db);
        await calculateClinicRevenue(db);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

// 1. Liệt kê các bệnh theo tháng
async function listDiseasesByMonth(db) {
    const month = "2024-09-01";
    const results = await db.collection('tbLanKham').aggregate([
        {
            $match: {
                ngayVaoVien: {
                    $gte: new Date(month),
                    $lt: new Date("2024-10-01")
                }
            }
        },
        {
            $group: {
                _id: "$tenBenh",
                soLuongBenhNhan: { $addToSet: "$maBenhNhan" }
            }
        },
        {
            $project: {
                tenBenh: "$_id",
                soLuongBenhNhan: { $size: "$soLuongBenhNhan" }
            }
        },
        { $sort: { soLuongBenhNhan: -1 } }
    ]).toArray();
    console.log("Danh sách các bệnh theo tháng:", results);
}

// 2. Tính lương bác sỹ
async function calculateDoctorSalary(db) {
    const results = await db.collection('tbLanKham').aggregate([
        {
            $group: {
                _id: "$maBacSy",
                soBenhNhanChuaKhoi: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "tbBacSy",
                localField: "_id",
                foreignField: "maBacSy",
                as: "bacSy"
            }
        },
        {
            $project: {
                maBacSy: "$_id",
                soBenhNhanChuaKhoi: 1,
                luongCoBan: 7000000,
                luongThuong: { $multiply: [1000000, "$soBenhNhanChuaKhoi"] },
                tongLuong: {
                    $add: [7000000, { $multiply: [1000000, "$soBenhNhanChuaKhoi"] }]
                }
            }
        }
    ]).toArray();
    console.log("Lương bác sỹ:", results);
}

// 3. Tính lương y tá
async function calculateNurseSalary(db) {
    const results = await db.collection('tbLanKham').aggregate([
        {
            $lookup: {
                from: "tbYTa",
                localField: "maLanKham",
                foreignField: "maLanKham",
                as: "yTa"
            }
        },
        {
            $unwind: "$yTa"
        },
        {
            $group: {
                _id: "$yTa.maYTa",
                soLanHoTro: { $sum: 1 }
            }
        },
        {
            $project: {
                maYTa: "$_id",
                luongCoBan: 5000000,
                luongThuong: { $multiply: [200000, "$soLanHoTro"] },
                tongLuong: {
                    $add: [5000000, { $multiply: [200000, "$soLanHoTro"] }]
                }
            }
        }
    ]).toArray();
    console.log("Lương y tá:", results);
}

// 4. Hiển thị lịch sử khám chữa bệnh của bệnh nhân
async function showPatientHistory(db) {
    const maBenhNhan = "BN001";
    const result = await db.collection('tbBenhNhan').aggregate([
        {
            $match: { maBenhNhan: maBenhNhan }
        },
        {
            $lookup: {
                from: "tbLanKham",
                localField: "maBenhNhan",
                foreignField: "maBenhNhan",
                as: "lichSuKham"
            }
        }
    ]).toArray();
    console.log("Lịch sử khám chữa bệnh của bệnh nhân:", result);
}

// 5. Tính doanh thu của phòng khám
async function calculateClinicRevenue(db) {
    const result = await db.collection('tbLanKham').aggregate([
        {
            $lookup: {
                from: "tbDonThuoc",
                localField: "maLanKham",
                foreignField: "maLanKham",
                as: "donThuoc"
            }
        },
        {
            $unwind: "$donThuoc"
        },
        {
            $unwind: "$donThuoc.thuoc"
        },
        {
            $group: {
                _id: null,
                doanhThuKham: { $sum: "$tongTien" },
                doanhThuThuoc: { $sum: { $multiply: ["$donThuoc.thuoc.soLuong", "$donThuoc.thuoc.giaTien"] } }
            }
        },
        {
            $project: {
                doanhThuKham: 1,
                doanhThuThuoc: 1,
                tongDoanhThu: { $add: ["$doanhThuKham", "$doanhThuThuoc"] }
            }
        }
    ]).toArray();
    console.log("Doanh thu của phòng khám:", result);
}

// Gọi hàm chính
main().catch(console.error);
