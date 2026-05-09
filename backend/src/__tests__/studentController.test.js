jest.mock("../models/Student");

const Student = require("../models/Student");
const {
  getAllStudents,
  getStudentProfile,
  createStudent,
  updateStudent,
} = require("../controllers/studentController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Student Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // getAllStudents
  describe("getAllStudents", () => {
    it("returns all students", async () => {
      const students = [{ name: "Alice" }, { name: "Bob" }];
      Student.find.mockResolvedValue(students);

      const req = {};
      const res = mockRes();

      await getAllStudents(req, res);

      expect(Student.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(students);
    });

    it("handles server error", async () => {
      Student.find.mockRejectedValue(new Error("DB error"));

      const req = {};
      const res = mockRes();

      await getAllStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // getStudentProfile
  describe("getStudentProfile", () => {
    it("returns student profile if found", async () => {
      const student = { name: "Alice", authProviderId: "auth123" };
      Student.findOne.mockResolvedValue(student);

      const req = { params: { id: "auth123" } };
      const res = mockRes();

      await getStudentProfile(req, res);

      expect(Student.findOne).toHaveBeenCalledWith({ authProviderId: "auth123" });
      expect(res.json).toHaveBeenCalledWith(student);
    });

    it("returns 404 if student not found", async () => {
      Student.findOne.mockResolvedValue(null);

      const req = { params: { id: "auth123" } };
      const res = mockRes();

      await getStudentProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Student not found" });
    });

    it("handles server error", async () => {
      Student.findOne.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "auth123" } };
      const res = mockRes();

      await getStudentProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  // createStudent
  describe("createStudent", () => {
    it("creates a student", async () => {
      const save = jest.fn();
      Student.mockImplementation(() => ({ save }));

      const req = { body: { name: "New Student" } };
      const res = mockRes();

      await createStudent(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("handles validation error", async () => {
      Student.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("Validation error")),
      }));

      const req = { body: {} };
      const res = mockRes();

      await createStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Validation error" });
    });
  });

  // updateStudent
  describe("updateStudent", () => {
    it("updates student", async () => {
      const updatedStudent = { name: "Updated Student" };
      Student.findByIdAndUpdate.mockResolvedValue(updatedStudent);

      const req = {
        params: { id: "123" },
        body: { name: "Updated Student" },
      };
      const res = mockRes();

      await updateStudent(req, res);

      expect(Student.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { name: "Updated Student" },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedStudent);
    });

    it("returns 404 if student not found", async () => {
      Student.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await updateStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Student not found" });
    });

    it("handles server error", async () => {
      Student.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await updateStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });
});