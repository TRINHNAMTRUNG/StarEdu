import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();
import { ENV } from "./config/environment";
import app from "./config/app";
import connectToDatabase from "./config/database";
import learningScheduleService from "./services/learningSchedule.service";

// Render sets PORT automatically, fallback to ENV.PORT
const PORT = process.env.PORT || ENV.PORT || 3090;

// Cron job: Chạy auto-reschedule mỗi ngày lúc 00:05 AM
const startCronJobs = () => {
    const schedule = require('node-cron');
    
    // Chạy reschedule hàng ngày lúc 00:05
    schedule.schedule('5 0 * * *', async () => {
        console.log('🔄 [CRON] Running daily schedule reschedule...');
        try {
            await learningScheduleService.rescheduleAllPendingSchedules();
            console.log('✅ [CRON] Daily reschedule completed');
        } catch (error) {
            console.error('❌ [CRON] Reschedule failed:', error);
        }
    }, {
        timezone: "Asia/Ho_Chi_Minh"
    });

    console.log('⏰ Cron jobs started - Auto-reschedule at 00:05 daily');
};

app.listen(PORT, async () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    await connectToDatabase();
    
    // Start cron jobs sau khi database connected
    startCronJobs();
});
