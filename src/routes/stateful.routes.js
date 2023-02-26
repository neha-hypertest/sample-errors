const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const { validators, validationErrorHandler } = require('../middlewares/validator');

const {
  listAllBanks, findUser, registerUser, saveOtp, verifyOtp,
  updateProfile, getLatestLoan, createNewLoan, actionUpdateOnLoan, cancelLoan,
  getLoanDetails, updateDocuments, getAllDocs, getProfileInfo, approveDocsAndLoan, rejectLoan
} = require('../model/stateful.model');

const router = express.Router();

const generateSession = async jwtData => new Promise((resolve, reject) => {
  jwt.sign(jwtData, process.env.JWT_SIGN_KEY,
    { expiresIn: '7d' },
    (err, token) => {
      if (err) return reject(err);
      return resolve(token);
    });
});

const verifySessionMiddleware = (req, res, next) => {
  if (!req.headers.authorization) {
    res.status(403).json({ success: false, msg: 'Authorization is missing from request headers.', data: {} });
    return next();
  }
  try {
    jwt.verify(req.headers.authorization, process.env.JWT_SIGN_KEY, (err, decoded) => {
      if (err) {
        return next(res.status(403).json({ success: false, msg: 'Authorization has been expired. Please do login again.', data: {} }));
      }
      req._decoded = decoded;
      return decoded;
    });
    return next();
  } catch (err) {
    console.log(err);
    return next(res.status(403).json({ success: false, msg: err.message || 'Something went wrong', data: {} }));
  }
};

const uploadDocsMiddleware = (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (request, file, cb) => {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.mimetype)) {
        cb(new multer.MulterError('Invalid format uploaded'));
      }
      cb(null, true);
    },
  }).single('document');
  upload(req, res, (err) => {
    if (err) {
      res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
      return next();
    }
    if (req.file.size > 5245000) { // More than 5MB check
      return res.status(400).json({ success: false, msg: 'Please upload File size lesser than 5MB.', data: {} });
    }
    return next();
  });
};

router.get('/stateful/list-banks', async (req, res, next) => {
  try {
    const bankListFromDB = await listAllBanks();
    return res.status(200).json(bankListFromDB);
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

router.post('/stateful/register', validators.registerUser, validationErrorHandler, async (req, res, next) => {
  const reqData = req.body;
  try {
    const user = await findUser(reqData.mobile);
    if (user) {
      return res.status(409).json({
        success: false,
        msg: 'User with this mobile already registered.',
        data: {}
      });
    }
    await registerUser(reqData);
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpType = 'REGISTERATION';
    await saveOtp(reqData.mobile, otp, otpType);
    return res.status(200).json({
      success: true,
      msg: 'OTP sent successfully. OTP will be expired after 5 minutes.',
      data: { otp, mobile: reqData.mobile, type: 'REGISTERATION' }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

router.put('/stateful/send-otp', validators.checkMobile, validationErrorHandler, async (req, res, next) => {
  const { mobile } = req.body;
  try {
    const user = await findUser(mobile);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: 'User not found with us.',
        data: {}
      });
    }
    if (user.otpExpiryInSeconds > 0 && user.otpCount < 3) {
      return res.status(200).json({
        success: false,
        msg: `OTP already sent, Please retry after ${user.otpExpiryInSeconds} seconds`,
        data: {}
      });
    }
    if (user.otpCount >= 3 && user.otpExpiryInSeconds >= -3600) {
      return res.status(400).json({
        success: false,
        msg: `Maximum OTP limit has been reached. Please try after ${Math.abs(-3600 - user.otpExpiryInSeconds)} seconds`,
        data: {}
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpType = user.isMobileVerified ? 'LOGIN' : 'REGISTERATION';
    await saveOtp(mobile, otp, otpType);
    return res.status(200).json({
      success: true,
      msg: 'OTP sent successfully. OTP will be expired after 5 minutes.',
      data: { otp, mobile, type: otpType }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

router.put('/stateful/verify-otp', validators.verifyOTP, validationErrorHandler, async (req, res, next) => {
  const reqData = {
    mobile: req.body.mobile,
    otp: req.body.otp
  };
  try {
    const user = await findUser(reqData.mobile);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: 'User not found with us.',
        data: {}
      });
    }
    if (user.otpExpiryInSeconds < 0) {
      return res.status(400).json({
        success: false,
        msg: 'OTP has been expired, Please retry sending otp again.',
        data: {}
      });
    }
    if (reqData.otp !== Number(user.otp)) {
      return res.status(400).json({
        success: false,
        msg: Number(user.otp) ? 'Invalid OTP entered, Please try again.' : 'Otp has already been verified.',
        data: {}
      });
    }
    await verifyOtp(reqData.mobile);
    const sessionId = await generateSession({ id: user.id, mobile: user.mobile });
    return res.status(200).json({
      success: true,
      msg: 'OTP verification successful.',
      data: { authorization: sessionId }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

router.post('/stateful/complete-profile', validators.profileUpdate, validationErrorHandler, verifySessionMiddleware, async (req, res, next) => {
  const userId = req._decoded.id;
  const reqData = req.body;
  try {
    await updateProfile(userId, reqData);
    return res.status(200).json({
      success: true,
      msg: 'Profile updated successfully.',
      data: reqData
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

router.post('/stateful/apply-loan', validators.applyLoan, validationErrorHandler, verifySessionMiddleware, async (req, res, next) => {
  const userId = req._decoded.id;
  const reqData = req.body;
  try {
    const prevLoanDetails = await getLatestLoan(userId);
    if (prevLoanDetails && prevLoanDetails.status === 'Approved') {
      return res.status(400).json({
        success: false,
        msg: 'Your loan application is in already in approved status. Either Decline or withdraw.',
        data: prevLoanDetails
      });
    }
    if (prevLoanDetails && prevLoanDetails.status === 'Pending'
          && Number(prevLoanDetails.loanCreationTimeLapsedInHours) < 24) {
      return res.status(400).json({
        success: false,
        msg: 'Your loan application is in pending state. Please wait for 24 hours.',
        data: prevLoanDetails
      });
    }
    if (prevLoanDetails && prevLoanDetails.status === 'Pending'
          && Number(prevLoanDetails.loanCreationTimeLapsedInHours) >= 24) {
      await cancelLoan(userId, prevLoanDetails.id);
    }
    await createNewLoan(userId, reqData);
    const newLoanDetails = await getLatestLoan(userId);
    return res.status(200).json({
      success: true,
      msg: 'Your loan application has been submitted.',
      data: newLoanDetails
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

router.post('/stateful/doc-upload', validators.documentUploadChecks, validationErrorHandler, uploadDocsMiddleware, verifySessionMiddleware, async (req, res, next) => {
  const userId = req._decoded.id;
  const reqData = { ...req.query, ...req.file };
  try {
    const loanDetails = await getLoanDetails(userId, reqData.loanId);
    if (!loanDetails) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid loan id provided.',
        data: {}
      });
    }
    if (Number(loanDetails.loanCreationTimeLapsedInHours) > 24) {
      return res.status(400).json({
        success: false,
        msg: 'Document upload time for this loan has been expired.',
        data: { loanDetails }
      });
    }

    if (loanDetails.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        msg: `Your loan is in ${loanDetails.status} state. This can be perform only on Pending state.`,
        data: {}
      });
    }
    await updateDocuments(userId, loanDetails.id, reqData.docType, reqData.originalname);
    return res.status(200).json({
      success: true,
      msg: 'Document uploaded successfully.',
      data: {}
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

router.put('/stateful/action-on-loan', validators.actionOnLoan, validationErrorHandler, verifySessionMiddleware, async (req, res, next) => {
  const userId = req._decoded.id;
  const reqData = req.body;
  try {
    const prevLoanDetails = await getLatestLoan(userId);
    if (!prevLoanDetails) {
      return res.status(400).json({
        success: false,
        msg: 'You haven\'t  applied any loan yet.',
        data: {}
      });
    }
    if (prevLoanDetails.id !== reqData.loanId) {
      return res.status().json({
        success: false,
        msg: 'Invalid loan id provided.',
        data: {}
      });
    }
    if (prevLoanDetails.status === 'Pending') {
      return res.status(400).json({
        success: false,
        msg: 'Your loan is not in Approved status yet. Please wait for some time.',
        data: prevLoanDetails
      });
    }
    if (['Disbursed', 'Declined', 'Cancelled'].includes(prevLoanDetails.status)) {
      return res.status(400).json({
        success: false,
        msg: `Your loan is in ${prevLoanDetails.status} state. This can't be undone.`,
        data: prevLoanDetails
      });
    }
    await actionUpdateOnLoan(userId, reqData);
    return res.status(200).json({
      success: true,
      msg: reqData.action === 'Decline' ? 'Your loan has been cancelled successfully.' : 'Your loan has been disbursed.',
      data: {}
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

// this will auto approve loan after approving docs on basis of monthly income.
router.post('/stateful/approve-loan', async (req, res, next) => {
  const { userId } = req.body;
  const { loanId } = req.body;
  try {
    const [docList, userProfile] = await Promise.all([
      getAllDocs(userId, loanId), getProfileInfo(userId)
    ]);
    if (docList.length < 3) {
      return res.status(400).json({
        success: false,
        msg: 'All Documents not uploaded yet.',
        data: {}
      });
    }
    if ((userProfile.employmentType === 'Salried' && userProfile.monthlyIncome > 15000)
          || (userProfile.employmentType === 'Self Employed' && userProfile.monthlyIncome > 50000)) {
      await approveDocsAndLoan(userId, loanId);
      return res.status(200).json({
        success: true,
        msg: 'Documents is marked approved and loan sanctioned by system.',
        data: {}
      });
    }
    await rejectLoan(userId, loanId);
    return res.status(200).json({
      success: true,
      msg: 'Documents approved but loan rejected by system.',
      data: {}
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, msg: err.message || 'Something went wrong', data: {} });
    return next();
  }
});

module.exports = router;
