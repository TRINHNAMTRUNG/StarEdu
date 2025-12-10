const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DB_URI = 'mongodb+srv://mongobasic:mongobasic123@cluster0.pgveher.mongodb.net/staredu_db?retryWrites=true&w=majority';

// Define User schema
const userSchema = new mongoose.Schema({
  phone: String,
  password: String,
  name: String,
  role: String,
  isActive: Boolean,
  isVerified: Boolean,
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function resetAdminPassword() {
  try {
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB');

    const adminPhone = '0966970857';
    const newPassword = 'trung123@';

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update admin password
    const result = await User.updateOne(
      { phone: adminPhone },
      { password: hashedPassword }
    );

    if (result.matchedCount === 0) {
      console.log('❌ Không tìm thấy admin với SĐT:', adminPhone);
    } else {
      console.log('✅ Đã reset mật khẩu admin thành công!');
      console.log('📱 SĐT:', adminPhone);
      console.log('🔑 Mật khẩu mới:', newPassword);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

resetAdminPassword();
