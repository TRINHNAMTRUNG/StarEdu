import mongoose from "mongoose";
import connectDB from "../config/database";
import { TestModel } from "../models/test.model";
import { QuestionModel } from "../models/question.model";
import TeacherModel from "../models/teacher.model";
import UserModel from "../models/user.model";
import fs from "fs";
import path from "path";

async function importPlacementTest() {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");

        // Lấy teacher
        const teacherUser = await UserModel.findOne({ phone: "0987654321" });
        if (!teacherUser) {
            throw new Error("Teacher user not found");
        }

        const teacher = await TeacherModel.findOne({ user: teacherUser._id });
        if (!teacher) {
            throw new Error("Teacher not found");
        }

        console.log("\n📝 Creating Placement Test...");

        // Đọc file ETS data
        const jsonPath = path.join(__dirname, "../../ets 2020 test 1.txt");
        const rawData = fs.readFileSync(jsonPath, "utf-8");
        const etsData = JSON.parse(rawData);

        // Chọn câu hỏi từ mỗi part
        const selectedQuestions = {
            part1: etsData[0].questions.slice(0, 3), // 3 câu Part 1
            part2: etsData[1].questions.slice(0, 8), // 8 câu Part 2
            part3: etsData[2].questions.slice(0, 2), // 2 groups = 6 câu Part 3
            part4: etsData[3].questions.slice(0, 2), // 2 groups = 6 câu Part 4
            part5: etsData[4].questions.slice(0, 8), // 8 câu Part 5
            part6: etsData[5].questions.slice(0, 1), // 1 group = 4 câu Part 6
            part7: etsData[6].questions.slice(0, 1), // 1 group = 5 câu Part 7
        };

        // Tạo object để lưu questionIds theo part
        const partQuestionIds: any = {
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
            7: []
        };

        // Import Part 1 - Hình ảnh
        console.log("\n📷 Importing Part 1 questions...");
        for (const q of selectedQuestions.part1) {
            const question = await QuestionModel.create({
                part: 1,
                type: "single",
                questionNumber: q.number,
                questionText: null,
                audio: q.audio,
                image: q.image,
                transcript: q.transcript,
                options: q.options,
                answer: q.answer,
                explanation: q.explanation
            });
            partQuestionIds[1].push(question._id);
            console.log(`  ✅ Created Q${q.number}`);
        }

        // Import Part 2 - Hỏi đáp
        console.log("\n🎤 Importing Part 2 questions...");
        for (const q of selectedQuestions.part2) {
            const question = await QuestionModel.create({
                part: 2,
                type: "single",
                questionNumber: q.number,
                questionText: null,
                audio: q.audio,
                transcript: q.transcript,
                options: q.options,
                answer: q.answer,
                explanation: q.explanation
            });
            partQuestionIds[2].push(question._id);
            console.log(`  ✅ Created Q${q.number}`);
        }

        // Import Part 3 - Hội thoại
        console.log("\n👥 Importing Part 3 questions...");
        for (const group of selectedQuestions.part3) {
            const subQuestionIds = [];
            
            // Tạo các câu hỏi con trước
            for (const q of group.questions) {
                const subQuestion = await QuestionModel.create({
                    part: 3,
                    type: "single",
                    questionNumber: q.number,
                    questionText: q.questionText,
                    options: q.options,
                    answer: q.answer,
                    explanation: q.explanation
                });
                subQuestionIds.push(subQuestion._id);
                console.log(`  ✅ Created Q${q.number}`);
            }

            // Tạo group question
            const groupQuestion = await QuestionModel.create({
                part: 3,
                type: "group",
                groupNumber: group.groupNumber,
                audio: group.audio,
                transcript: group.transcript,
                contextHtml: group.contextHTML,
                subQuestions: subQuestionIds
            });
            
            // Thêm group question vào partQuestionIds
            partQuestionIds[3].push(groupQuestion._id);
            console.log(`  ✅ Created Group ${group.groupNumber} with ${subQuestionIds.length} questions`);
        }

        // Import Part 4 - Diễn thuyết
        console.log("\n🎙️ Importing Part 4 questions...");
        for (const group of selectedQuestions.part4) {
            const subQuestionIds = [];
            
            for (const q of group.questions) {
                const subQuestion = await QuestionModel.create({
                    part: 4,
                    type: "single",
                    questionNumber: q.number,
                    questionText: q.questionText,
                    options: q.options,
                    answer: q.answer,
                    explanation: q.explanation
                });
                subQuestionIds.push(subQuestion._id);
                console.log(`  ✅ Created Q${q.number}`);
            }

            const groupQuestion = await QuestionModel.create({
                part: 4,
                type: "group",
                groupNumber: group.groupNumber,
                audio: group.audio,
                transcript: group.transcript,
                contextHtml: group.contextHTML,
                subQuestions: subQuestionIds
            });
            
            // Thêm group question vào partQuestionIds
            partQuestionIds[4].push(groupQuestion._id);
            console.log(`  ✅ Created Group ${group.groupNumber} with ${subQuestionIds.length} questions`);
        }

        // Import Part 5 - Incomplete Sentences
        console.log("\n📝 Importing Part 5 questions...");
        for (const q of selectedQuestions.part5) {
            const question = await QuestionModel.create({
                part: 5,
                type: "single",
                questionNumber: q.number,
                questionText: q.questionText,
                options: q.options,
                answer: q.answer,
                explanation: q.explanation
            });
            partQuestionIds[5].push(question._id);
            console.log(`  ✅ Created Q${q.number}`);
        }

        // Import Part 6 - Text Completion
        console.log("\n📄 Importing Part 6 questions...");
        for (const group of selectedQuestions.part6) {
            const subQuestionIds = [];
            
            for (const q of group.questions) {
                const subQuestion = await QuestionModel.create({
                    part: 6,
                    type: "single",
                    questionNumber: q.number,
                    questionText: q.questionText,
                    options: q.options,
                    answer: q.answer,
                    explanation: q.explanation
                });
                subQuestionIds.push(subQuestion._id);
                console.log(`  ✅ Created Q${q.number}`);
            }

            const groupQuestion = await QuestionModel.create({
                part: 6,
                type: "group",
                groupNumber: group.groupNumber,
                contextHtml: group.contextHTML,
                subQuestions: subQuestionIds
            });
            
            // Thêm group question vào partQuestionIds
            partQuestionIds[6].push(groupQuestion._id);
            console.log(`  ✅ Created Group ${group.groupNumber} with ${subQuestionIds.length} questions`);
        }

        // Import Part 7 - Reading Comprehension
        console.log("\n📖 Importing Part 7 questions...");
        for (const group of selectedQuestions.part7) {
            const subQuestionIds = [];
            
            for (const q of group.questions) {
                const subQuestion = await QuestionModel.create({
                    part: 7,
                    type: "single",
                    questionNumber: q.number,
                    questionText: q.questionText,
                    options: q.options,
                    answer: q.answer,
                    explanation: q.explanation
                });
                subQuestionIds.push(subQuestion._id);
                console.log(`  ✅ Created Q${q.number}`);
            }

            const groupQuestion = await QuestionModel.create({
                part: 7,
                type: "group",
                groupNumber: group.groupNumber,
                contextHtml: group.contextHTML,
                subQuestions: subQuestionIds
            });
            
            // Thêm group question vào partQuestionIds
            partQuestionIds[7].push(groupQuestion._id);
            console.log(`  ✅ Created Group ${group.groupNumber} with ${subQuestionIds.length} questions`);
        }

        // Tạo Test
        console.log("\n🎯 Creating Placement Test...");
        
        // Xóa test cũ nếu có
        await TestModel.deleteOne({ title: "TOEIC Placement Test - Đánh giá trình độ đầu vào" });

        const test = await TestModel.create({
            title: "TOEIC Placement Test - Đánh giá trình độ đầu vào",
            year: 2024,
            source: "ETS TOEIC 2020 Test 1",
            parts: [
                { partNumber: 1, questionIds: partQuestionIds[1] },
                { partNumber: 2, questionIds: partQuestionIds[2] },
                { partNumber: 3, questionIds: partQuestionIds[3] },
                { partNumber: 4, questionIds: partQuestionIds[4] },
                { partNumber: 5, questionIds: partQuestionIds[5] },
                { partNumber: 6, questionIds: partQuestionIds[6] },
                { partNumber: 7, questionIds: partQuestionIds[7] }
            ],
            created_by: teacher._id,
            is_published: true,
            time_limit: 45, // 45 phút
            passing_score: 60 // 60%
        });

        console.log(`✅ Created Test: ${test.title}`);

        // Tổng kết
        console.log("\n" + "=".repeat(60));
        console.log("📊 IMPORT SUMMARY");
        console.log("=".repeat(60));
        console.log(`✅ Test: ${test.title}`);
        console.log(`📝 Total Questions: 40`);
        console.log(`   Part 1: 3 questions`);
        console.log(`   Part 2: 8 questions`);
        console.log(`   Part 3: 6 questions (2 groups)`);
        console.log(`   Part 4: 6 questions (2 groups)`);
        console.log(`   Part 5: 8 questions`);
        console.log(`   Part 6: 4 questions (1 group)`);
        console.log(`   Part 7: 5 questions (1 group)`);
        console.log(`⏱️  Time Limit: 45 minutes`);
        console.log(`✅ Passing Score: 60%`);
        console.log("=".repeat(60));

        console.log("\n✅ Placement test imported successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error importing placement test:", error);
        process.exit(1);
    }
}

// Run import
importPlacementTest();
