// studentRoutes.js
const express = require("express");
const router = express.Router();
const { getAllStudents, getStudentProfile, createStudent, updateStudent } = require("../controllers/studentController");

router.get("/", getAllStudents);
router.get("/:id", getStudentProfile);
router.post("/", createStudent);
router.put("/:id", updateStudent);

module.exports = router;