import fs from "fs";
import mongoose from "mongoose";
import { TestModel } from "../models/test.model";
import { QuestionModel } from "../models/question.model";

const MONGO_URI = "mongodb+srv://mongobasic:mongobasic123@cluster0.pgveher.mongodb.net/staredu_db?retryWrites=true&w=majority&appName=Cluster0";

async function importETSData() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const raw = fs.readFileSync("ets 2020 test 2.txt", "utf-8");
    const data = JSON.parse(raw);
    const testData = data.ETS["2020"]["Practice Test 2"];

    const partsData = [];
    for (const partObj of testData.parts) {
        const questionIds: any[] = [];

        for (const q of partObj.questions) {
            if (q.type === "single") {
                const question = await QuestionModel.create({
                    part: partObj.part,
                    type: "single",
                    questionNumber: q.number,
                    questionText: q.questionText,
                    audio: q.audio,
                    image: q.image,
                    transcript: q.transcript,
                    options: q.options,
                    answer: q.answer,
                    explanation: q.explanation
                });
                questionIds.push(question._id);
            }

            if (q.type === "group") {
                const subQuestionIds: any[] = [];
                for (const sq of q.questions) {
                    const subQ = await QuestionModel.create({
                        part: partObj.part,
                        type: "single",
                        questionNumber: sq.number,
                        questionText: sq.questionText,
                        options: sq.options,
                        answer: sq.answer,
                        explanation: sq.explanation
                    });
                    subQuestionIds.push(subQ._id);
                }

                const group = await QuestionModel.create({
                    part: partObj.part,
                    type: "group",
                    groupNumber: q.groupNumber,
                    contextHtml: q.contextHtml,
                    transcript: q.transcript,
                    subQuestions: subQuestionIds
                });
                questionIds.push(group._id);
            }
        }

        partsData.push({
            partNumber: partObj.part,
            questionIds
        });
    }

    await TestModel.create({
        title: "ETS 2020 Practice Test 1",
        year: 2020,
        audioUrl: testData.testAudio,
        parts: partsData
    });

    console.log("✅ Import completed");
    process.exit(0);
}

importETSData().catch(console.error);
