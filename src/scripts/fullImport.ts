import 'reflect-metadata';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { TestModel } from '../models/test.model';
import { QuestionModel } from '../models/question.model';

dotenv.config();

interface QuestionData {
    type: 'single' | 'group';
    groupNumber?: number;
    number?: number;
    questionText?: string | null;
    audio?: string | null;
    image?: string | null;
    images?: any[];
    contextHTML?: string | null;  // For Part 6, 7 - HTML content
    transcript?: string | null;   // For Part 3, 4 - Audio transcript
    options?: any;
    answer?: string;
    explanation?: string;
    questions?: any[]; // For group type
}

interface PartData {
    part: number;
    questions: QuestionData[];
}

async function connectDB() {
    try {
        const dbUri = process.env.DB_URI || '';
        await mongoose.connect(dbUri, { dbName: process.env.DB_NAME });
        console.log('✅ MongoDB connected successfully\n');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function fullImport() {
    await connectDB();

    try {
        console.log('🔄 Starting full import process...\n');

        // 1. Đọc file dữ liệu
        const filePath = path.join(__dirname, '../../ets 2020 test 1.txt');
        console.log('📂 Reading file:', filePath);
        
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const partsData: PartData[] = JSON.parse(rawData);
        console.log('✅ File parsed successfully\n');

        // 2. Tạo test mới
        console.log('🆕 Creating new test...');
        const test = await TestModel.create({
            title: 'ETS 2020 Practice Test 1',
            year: 2020,
            source: 'ETS',
            audioUrl: 'https://s4-media1.study4.com/media/tez_media1/sound/ets_toeic_2022_test_1_full.mp3',
            time_limit: 120,
            passing_score: 400,
            is_published: true,
            created_by: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
            parts: []
        });

        console.log('✅ Test created!');
        console.log('📝 Test ID:', test._id);
        console.log('🏷️  Title:', test.title, '\n');

        // 3. Import questions
        console.log('📥 Importing questions...\n');
        
        const newParts: any[] = [];
        let totalQuestionsCreated = 0;

        for (const partData of partsData) {
            console.log(`\n--- Part ${partData.part} ---`);
            const questionIds: any[] = [];

            for (const q of partData.questions) {
                if (q.type === 'single') {
                    // Single question
                    const question = await QuestionModel.create({
                        part: partData.part,
                        type: 'single',
                        questionNumber: q.number,
                        questionText: q.questionText,
                        audio: q.audio,
                        image: q.image,
                        options: q.options,
                        transcript: q.transcript,
                        answer: q.answer,
                        explanation: q.explanation
                    });

                    questionIds.push(question._id);
                    totalQuestionsCreated++;
                    
                } else if (q.type === 'group') {
                    // Group question
                    const subQuestionIds: any[] = [];

                    // Tạo sub-questions trước
                    for (const subQ of q.questions || []) {
                        const subQuestion = await QuestionModel.create({
                            part: partData.part,
                            type: 'single',
                            questionNumber: subQ.number,
                            questionText: subQ.questionText,
                            options: subQ.options,
                            answer: subQ.answer,
                            explanation: subQ.explanation
                        });

                        subQuestionIds.push(subQuestion._id);
                        totalQuestionsCreated++;
                    }

                    // Tạo parent group question
                    // Part 3, 4: có audio + transcript (listening)
                    // Part 6, 7: có contextHTML + transcript (reading passages)
                    const groupData = {
                        part: partData.part,
                        type: 'group' as const,
                        groupNumber: q.groupNumber,
                        questionNumber: q.questions?.[0].number,
                        audio: q.audio || null,
                        image: (q.images && q.images.length > 0) ? q.images[0] : null, // Lấy ảnh đầu tiên nếu có
                        contextHtml: q.contextHTML || null,  // HTML content cho Part 6, 7
                        transcript: q.transcript || null,     // Transcript cho tất cả
                        subQuestions: subQuestionIds,
                        options: { A: '', B: '', C: '', D: '' }
                    };

                    const groupQuestion = await QuestionModel.create(groupData);

                    // Debug logging
                    if ((partData.part === 3 && q.groupNumber === 1) || 
                        (partData.part === 6 && q.groupNumber === 24)) {
                        console.log(`\n� DEBUG - Part ${partData.part}, Group ${q.groupNumber}:`);
                        console.log('  audio:', groupQuestion.audio ? '✅' : '❌');
                        console.log('  image:', groupQuestion.image ? '✅' : '❌');
                        console.log('  contextHtml:', groupQuestion.contextHtml ? `✅ (${groupQuestion.contextHtml.length} chars)` : '❌');
                        console.log('  transcript:', groupQuestion.transcript ? `✅ (${groupQuestion.transcript.length} chars)` : '❌');
                    }

                    questionIds.push(groupQuestion._id);
                    totalQuestionsCreated++;
                }

                if (totalQuestionsCreated % 10 === 0) {
                    process.stdout.write(`  Created ${totalQuestionsCreated} questions...\r`);
                }
            }

            newParts.push({
                partNumber: partData.part,
                questionIds: questionIds
            });

            console.log(`\n✅ Part ${partData.part}: Created ${questionIds.length} parent questions`);
        }

        console.log(`\n\n✅ Total questions created: ${totalQuestionsCreated}\n`);

        // 4. Cập nhật test với questions
        console.log('🔄 Updating test with questions...');
        test.parts = newParts as any;
        await test.save();
        console.log('✅ Test updated successfully!\n');

        // 5. Verify
        console.log('🔍 Verifying import...');
        const updatedTest = await TestModel.findById(test._id);
        
        let totalQuestions = 0;
        if (updatedTest) {
            for (const part of updatedTest.parts) {
                totalQuestions += part.questionIds.length;
            }
        }

        console.log(`✅ Test has ${totalQuestions} questions across ${updatedTest?.parts.length || 0} parts\n`);

        // Show breakdown by part
        console.log('📊 Questions by part:');
        if (updatedTest) {
            for (const part of updatedTest.parts) {
                console.log(`  Part ${part.partNumber}: ${part.questionIds.length} questions`);
            }
        }

        console.log('\n✅ Full import completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Error during import:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🎉 All done! Database connection closed.\n');
    }
}

fullImport();
