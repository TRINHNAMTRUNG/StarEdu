import 'reflect-metadata';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { TestModel } from '../models/test.model';
import { QuestionModel } from '../models/question.model';

dotenv.config();

async function cleanDatabase() {
    try {
        const dbUri = process.env.DB_URI || '';
        await mongoose.connect(dbUri, { dbName: process.env.DB_NAME });
        console.log('✅ MongoDB connected\n');

        console.log('🗑️  Deleting ALL tests...');
        const testResult = await TestModel.deleteMany({});
        console.log(`✅ Deleted ${testResult.deletedCount} tests\n`);

        console.log('🗑️  Deleting ALL questions...');
        const questionResult = await QuestionModel.deleteMany({});
        console.log(`✅ Deleted ${questionResult.deletedCount} questions\n`);

        console.log('✨ Database cleaned successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Done');
    }
}

cleanDatabase();
