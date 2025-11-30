import "reflect-metadata";
import { container } from "tsyringe";
import { AuthController } from "./src/controllers/auth.controller";
import AuthService from "./src/services/auth.service";
import InfobipService from "./src/services/infobip.service";
import StudentService from "./src/services/student.service";
import TeacherService from "./src/services/teacher.service";

// Test DI resolution
try {
    console.log("Testing InfobipService...");
    const infobip = container.resolve(InfobipService);
    console.log("✅ InfobipService resolved:", !!infobip);

    console.log("\nTesting StudentService...");
    const student = container.resolve(StudentService);
    console.log("✅ StudentService resolved:", !!student);

    console.log("\nTesting TeacherService...");
    const teacher = container.resolve(TeacherService);
    console.log("✅ TeacherService resolved:", !!teacher);

    console.log("\nTesting AuthService...");
    const authService = container.resolve(AuthService);
    console.log("✅ AuthService resolved:", !!authService);
    console.log("AuthService dependencies:", {
        infobipService: !!(authService as any).infobipService,
        studentService: !!(authService as any).studentService,
        teacherService: !!(authService as any).teacherService
    });

    console.log("\nTesting AuthController...");
    const authController = container.resolve(AuthController);
    console.log("✅ AuthController resolved:", !!authController);
    console.log("AuthController.authService:", !!(authController as any).authService);

    console.log("\n🎉 All DI tests passed!");
} catch (error: any) {
    console.error("\n❌ DI Error:", error.message);
    console.error("Stack:", error.stack);
}
