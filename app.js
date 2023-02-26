/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

require('dotenv-flow').config({
  path: path.join(__dirname, './')
});
const statefulRoutes = require('./src/routes/stateful.routes');
const performanceRoutes = require('./src/routes/performance.routes');
const statelessRoutes = require('./src/routes/stateless.routes');

const app = express();
const server = app.listen(process.env.PORT, () => {
  console.info(`Server started on ${new Date()}`);
  console.info(`server is running at http://${server.address().address}:${server.address().port}`);
});
app.use(express.json());

// Body Parser Configuration to support JSON-encoded bodies
app.use(bodyParser.json({ limit: '1mb' }));
// to support URL-encoded bodies
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));

// Router Initialization
app.get('/app/ping', (req, res) => res.status(200).json({ success: true, msg: 'Pong', data: {} }));
app.use('/app', statefulRoutes);
app.use('/app', performanceRoutes);
app.use('/app', statelessRoutes);

module.exports = app;
