const mongoose = require('mongoose');

// Define schemas
const ScheduleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roadmap_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' }],
  schedule_config: {
    days_per_week: Number,
    min_hours_per_day: Number,
    max_hours_per_day: Number,
    start_date: Date,
    focus_skills: [String]
  },
  scheduled_lessons: Array,
  auto_reschedule: { type: Boolean, default: true }
}, { timestamps: true });

const EnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roadmap: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' }
}, { timestamps: true });

const LearningSchedule = mongoose.model('LearningSchedule', ScheduleSchema);
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/staredu';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Lấy thông tin từ enrollment
    const paymentId = '6935c816e3f7afe18b8ea23f';
    const enrollments = await Enrollment.find({ payment_id: paymentId });
    
    if (enrollments.length === 0) {
      console.log('❌ Không tìm thấy enrollment với payment_id:', paymentId);
      process.exit(1);
    }
    
    console.log(`📚 Found ${enrollments.length} enrollments`);
    
    const userId = enrollments[0].student;
    const roadmapIds = enrollments.map(e => e.roadmap);
    
    // Tạo schedule config mặc định
    const scheduleConfig = {
      days_per_week: 5,
      min_hours_per_day: 1,
      max_hours_per_day: 3,
      start_date: new Date(),
      focus_skills: ['listening', 'reading']
    };
    
    // Tạo learning schedule
    const schedule = new LearningSchedule({
      user_id: userId,
      roadmap_ids: roadmapIds,
      schedule_config: scheduleConfig,
      scheduled_lessons: [],
      auto_reschedule: true
    });
    
    await schedule.save();
    
    console.log('\n✅ Learning Schedule created:');
    console.log(JSON.stringify(schedule, null, 2));
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
