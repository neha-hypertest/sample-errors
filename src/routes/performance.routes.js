const express = require('express');

const router = express.Router();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

router.get('/performance/standard', async (req, res) => {
  // Do not change standard route code block.
  await sleep(100);
  return res.status(200).json({
    success: true,
    msg: 'Standard route response.',
    data: {
      id: 1,
      type: 'Standard',
      path: req.originalUrl,
      headers: req.headers
    }
  });
});

router.get('/performance/delayed', async (req, res) => {
  // TODO: Increase time in timeout function when changing in your branch.
  await sleep(1000);
  return res.status(200).json({
    success: true,
    msg: 'Delayed route response.',
    data: {
      id: 2,
      type: 'Delayed',
      path: req.originalUrl,
      headers: req.headers
    }
  });
});

router.get('/performance/boosted', async (req, res) => {
  // TODO: Decrease time in timeout function when changing in your branch.
  await sleep(3000);
  return res.status(200).json({
    success: true,
    msg: 'Boosted route response.',
    data: {
      id: 3,
      type: 'Boosted',
      path: req.originalUrl,
      headers: req.headers
    }
  });
});


module.exports = router;
