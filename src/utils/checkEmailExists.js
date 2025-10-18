const Student = require('../models/studentsModel');
const Agent = require('../models/agentModel');
const University = require('../models/universityModel');
const Solicitor = require('../models/solicitorModel');
const Agency = require('../models/agencyModel');
const AssociateSolicitor = require('../models/associateModel');

const checkEmailExists = async (email, session = null) => {
  const normalizedEmail = email?.toLowerCase();

  const existingStudent = await Student.findOne({ email: normalizedEmail }).session(session);
  if (existingStudent) return 'student';

  const existingAgent = await Agent.findOne({ email: normalizedEmail }).session(session);
  if (existingAgent) return 'agent';

  const existingUniversity = await University.findOne({ email: normalizedEmail }).session(session);
  if (existingUniversity) return 'University';

  const existingSolicitor = await Solicitor.findOne({ email: normalizedEmail }).session(session);
  if (existingSolicitor) return 'solicitor';

  const existingAgency = await Agency.findOne({ email: normalizedEmail }).session(session);
  if (existingAgency) return 'admin';

  const existingAssociate = await AssociateSolicitor.findOne({ email: normalizedEmail }).session(session);
  if (existingAssociate) return 'Associate';

  // If no match found
  return null;
};

// const checkEmailExists = async (email, session = null) => {
//   const existingStudent = await Student.findOne({ email }).session(session);
//   if (existingStudent) return 'student';

//   const existingAgent = await Agent.findOne({ email }).session(session);
//   if (existingAgent) return 'agent';

//   const existingUniversity = await University.findOne({ email }).session(session);
//   if (existingUniversity) return 'University';

//   const existingSolicitor = await Solicitor.findOne({ email }).session(session);
//   if (existingSolicitor) return 'solicitor';

//   const existingAgency = await Agency.findOne({ email }).session(session);
//   if (existingAgency) return 'admin';

//   const existingAssociate = await AssociateSolicitor.findOne({ email }).session(session);
//   if (existingAssociate) return 'Associate';

//   // If no match found
//   return null;
// };

module.exports = checkEmailExists;
