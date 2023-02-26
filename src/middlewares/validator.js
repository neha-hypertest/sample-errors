const { body, query, validationResult } = require('express-validator');

const validators = {
  registerUser: [
    body('name').not().isEmpty().matches(/^[a-zA-Z\s]*$/).trim().withMessage('Only alphabets allowed.'),
    body('mobile').not().isEmpty().matches(/^[6-9]\d{9}$/).trim().withMessage('Invalid mobile number format.'),
    body('gender').not().isEmpty().isIn(['Male', 'Female', 'Other']).withMessage('Only valid gender is allowd. (Male, Female, Other)')
  ],
  checkMobile: [
    body('mobile').not().isEmpty().matches(/^[6-9]\d{9}$/).trim().withMessage('Invalid mobile number format.')
  ],
  verifyOTP: [
    body('mobile').not().isEmpty().matches(/^[6-9]\d{9}$/).trim().withMessage('Invalid mobile number format.'),
    body('otp').not().isEmpty().isLength({ min: 6, max: 6 }).isInt().toInt().withMessage('Only numerics allowed.')
  ],
  profileUpdate: [
    body('accountNumber').not().isEmpty().isInt().toInt().withMessage('Only numerics allowed.'),
    body('ifsc').not().isEmpty().matches(/^[A-Za-z]{4}\d{7}$/).trim().withMessage('Invalid IFSC format.'),
    body('accountType').not().isEmpty().isIn(['Savings', 'Current']).withMessage('Only valid account type is allowd. (Savings, Current)'),
    body('pan').not().isEmpty().matches(/[A-Z]{5}[0-9]{4}[A-Z]{1}/).trim().withMessage('Invalid PAN number format.'),
    body('monthlyIncome').not().isEmpty().isInt({ gte: 0 }).toInt().withMessage('Only numerics allowed.'),
    body('employmentType').not().isEmpty().isIn(['Salaried', 'Self Employed', 'Other', 'None'])
      .withMessage('Only valid employment type is allowd. (Salaried, Self Employed, Other, None)')
  ],
  applyLoan: [
    body('loanType').not().isEmpty().isIn(['Personal Loan', 'Gold Loan', 'Home Loan', 'Education Loan', 'Loan Against Property'])
      .withMessage("Allowed loan types are 'Personal Loan', 'Gold Loan', 'Home Loan', 'Education Loan', 'Loan Against Property'"),
    body('loanAmount').not().isEmpty().isInt({ gt: 24999 }).toInt().withMessage('Loan amount should be Integer and greater than or equal to ₹25000'),
    body('loanTenureInMonths').not().isEmpty().isInt({ gt: 5, lt: 61 }).toInt()
      .withMessage('Loan amount tenure should be Integer and between 6 Months to 60 Months.'),
  ],
  actionOnLoan: [
    body('loanId').not().isEmpty().isInt().toInt().withMessage('Only numerics allowed.'),
    body('action').not().isEmpty().isIn(['Disburse', 'Decline']).withMessage('Valid loan actions are (Withdraw or Decline).')
  ],
  documentUploadChecks: [
    query('loanId').not().isEmpty().isInt().toInt().withMessage('Only numerics allowed.'),
    query('docType').not().isEmpty().isIn(['PAN', 'Aadhar', 'Bank Statement']).withMessage('Supported document type is PAN, Aadhar & Bank Statement.')
  ]
};

const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400)
      .json({ success: false, msg: 'Oops. Please check your payload.', data: { errors: errors.array() } });
  }
  return next();
};

module.exports = {
  validators,
  validationErrorHandler
};
