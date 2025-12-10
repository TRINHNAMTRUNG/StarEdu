require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function resetAdmin() {
  try {
    // Kết nối với database name rõ ràng
    const dbUri = process.env.DB_URI.replace('/?', '/staredu_db?');
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB');

    // Tìm user với _id chính xác
    const userId = '68bc1f45d38a5697f576a526';
    const newPassword = 'admin123';

    // Hash password với bcrypt (giống model)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('🔐 New hash:', hashedPassword);

    const result = await User.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { password: hashedPassword }
    );

    console.log('📊 Update result:', result);

    if (result.modifiedCount > 0) {
      console.log('✅ Reset mật khẩu thành công!');
      console.log('📱 SĐT: 0966970857');
      console.log('🔑 Mật khẩu mới:', newPassword);
    } else {
      console.log('❌ Không tìm thấy user hoặc mật khẩu đã giống');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
  process.exit(0);
}

resetAdmin();
