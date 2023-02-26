const express = require('express');

const router = express.Router();

const dummyUsersList = [
  {
    id: 81,
    name: 'Satoshi Nakamoto',
    email: 'satoshin@gmx.com',
    rating: 4.8,
    credit: 100,
    currentTimpestamp: Date.now()
  },
  {
    id: 86,
    name: 'Edward Snowden',
    email: 'Ed_Snowden@lavabit.com',
    rating: 4.6,
    credit: 96,
    currentTimpestamp: Date.now()
  },
  {
    id: 82,
    name: 'Vitalik Buterin',
    email: 'vitalik@ethereum.org',
    rating: 4.2,
    credit: 94,
    currentTimpestamp: Date.now()
  },
  {
    id: 88,
    name: 'Mark Zuckerberg',
    email: 'zuckerberg@fb.com',
    rating: 4.1,
    credit: 93,
    currentTimpestamp: Date.now()
  },
  {
    id: 90,
    name: 'Elon Musk',
    email: 'elon@tesla.com',
    rating: 4.1,
    credit: 91,
    currentTimpestamp: Date.now()
  },
];


router.get('/stateless/content_type_example', (req, res) => res.status(200).json({
  success: true,
  msg: 'Content type example.',
  data: dummyUsersList[4]
}));


router.get('/stateless/status_code_example', (req, res) => res.status(200).json({
  success: true, msg: 'Status code example.', data: dummyUsersList[0]
}));


router.get('/stateless/header_added_example', (req, res) => res.status(200).json({
  success: true, msg: 'Header added example.', data: dummyUsersList[0]
}));


router.get('/stateless/header_modified_example', (req, res) => {
  res.header('Access-Control-Request-Method', 'GET');
  return res.status(200).json({ success: true, msg: 'Header modified example.', data: dummyUsersList[0] });
});


router.get('/stateless/header_removed_example', (req, res) => res.status(200).json({
  success: true, msg: 'Header removed example.', data: dummyUsersList[0]
}));


router.get('/stateless/key_removed_example', (req, res) => res.status(200).json({
  success: true, msg: 'Key removed example.', data: dummyUsersList[3]
}));


router.get('/stateless/key_added_example', (req, res) => res.status(200).json({
  success: true, msg: 'Key added example.', data: dummyUsersList[1]
}));


router.get('/stateless/value_modified_example', (req, res) => res.status(200).json({
  success: true, msg: 'Value modified example.', data: dummyUsersList[2]
}));


router.get('/stateless/array_value_modified_example', (req, res) => res.status(200).json({
  success: true, msg: 'Array value modified example.', data: dummyUsersList
}));


router.get('/stateless/array_order_changed_example', (req, res) => res.status(200).json({
  success: true, msg: 'Array order changed example.', data: dummyUsersList
}));


module.exports = router;
