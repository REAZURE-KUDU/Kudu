jest.mock("../models/Admin");

const Admin = require("../models/Admin");
const {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
} = require("../controllers/adminController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Admin Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllAdmins", () => {
    it("returns all admins", async () => {
      const admins = [{ email: "admin@test.com" }];
      Admin.find.mockResolvedValue(admins);

      const req = {};
      const res = mockRes();

      await getAllAdmins(req, res);

      expect(Admin.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(admins);
    });

    it("handles server error", async () => {
      Admin.find.mockRejectedValue(new Error("DB error"));

      const req = {};
      const res = mockRes();

      await getAllAdmins(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  describe("getAdminById", () => {
    it("returns admin if found by authProviderId", async () => {
      const admin = {
        email: "admin@test.com",
        authProviderId: "auth0|123",
      };

      Admin.find.mockResolvedValue([
        { authProviderId: "auth0|123", email: "admin@test.com" },
      ]);
      Admin.findOne.mockResolvedValue(admin);

      const req = { params: { id: "auth0|123" } };
      const res = mockRes();

      await getAdminById(req, res);

      expect(Admin.findOne).toHaveBeenCalledWith({
        authProviderId: "auth0|123",
      });
      expect(res.json).toHaveBeenCalledWith(admin);
    });

    it("returns 404 if admin not found", async () => {
      Admin.find.mockResolvedValue([]);
      Admin.findOne.mockResolvedValue(null);

      const req = { params: { id: "auth0|999" } };
      const res = mockRes();

      await getAdminById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Admin not found" });
    });

    it("handles server error", async () => {
      Admin.find.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "auth0|123" } };
      const res = mockRes();

      await getAdminById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  describe("createAdmin", () => {
    it("creates an admin", async () => {
      const save = jest.fn();
      Admin.mockImplementation(() => ({ save }));

      const req = {
        body: { email: "admin@test.com", authProviderId: "auth0|123" },
      };
      const res = mockRes();

      await createAdmin(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("handles validation error", async () => {
      Admin.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("Validation error")),
      }));

      const req = { body: {} };
      const res = mockRes();

      await createAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Validation error" });
    });
  });

  describe("updateAdmin", () => {
    it("updates admin", async () => {
      const updatedAdmin = { email: "updated@test.com" };
      Admin.findByIdAndUpdate.mockResolvedValue(updatedAdmin);

      const req = {
        params: { id: "123" },
        body: { email: "updated@test.com" },
      };
      const res = mockRes();

      await updateAdmin(req, res);

      expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { email: "updated@test.com" },
        { new: true, runValidators: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedAdmin);
    });

    it("returns 404 if admin not found", async () => {
      Admin.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await updateAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Admin not found" });
    });

    it("handles server error", async () => {
      Admin.findByIdAndUpdate.mockRejectedValue(new Error("DB error"));

      const req = { params: { id: "123" }, body: {} };
      const res = mockRes();

      await updateAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });
});