const mongoose = require('mongoose');

// Define schemas inline
const PaymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roadmap: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' },
  roadmaps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' }],
  amount: Number,
  gateway: String,
  status: String,
  order_id: String
}, { timestamps: true });

const EnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roadmap: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' },
  payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  enrolled_by: String,
  enrolled_price: Number,
  status: String
}, { timestamps: true });

const ScheduleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roadmap_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' }],
  schedule_config: Object,
  scheduled_lessons: Array
}, { timestamps: true });

const Payment = mongoose.model('Payment', PaymentSchema);
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
const LearningSchedule = mongoose.model('LearningSchedule', ScheduleSchema);

const paymentId = '6935c816e3f7afe18b8ea23f';

// Get MongoDB URI from environment or use default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/staredu';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Check payment
    const payment = await Payment.findById(paymentId).populate('roadmaps');
    console.log('💳 Payment:', JSON.stringify(payment, null, 2));
    
    if (payment) {
      // Check enrollments
      const enrollments = await Enrollment.find({ payment_id: paymentId }).populate('roadmap');
      console.log('\n📚 Enrollments (' + enrollments.length + '):', JSON.stringify(enrollments, null, 2));
      
      // Check learning schedule
      const schedule = await LearningSchedule.findOne({ user_id: payment.student });
      console.log('\n📅 Learning Schedule:', JSON.stringify(schedule, null, 2));
    }
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
