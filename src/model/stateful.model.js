const { execSQLQuery, execSQLTxn } = require('../../dbConnection');

class RidesQuery {
  async listAllBanks() {
    const sqlQuery = 'SELECT id, bank_name "bankName" FROM bank_list;';
    const bankListInt = await execSQLQuery(sqlQuery);
    return bankListInt;
  }

  async findUser(mobile) {
    const sqlQuery = `SELECT u.id, customer_name name, mobile, is_mobile_verified AS "isMobileVerified", gender, 
    otp, type, count AS "otpCount", CEIL(EXTRACT(EPOCH FROM (expires_at - current_timestamp))) AS "otpExpiryInSeconds"
    FROM users u
    LEFT JOIN otp ON otp.user_id = u.id 
    WHERE mobile = '${mobile}';`;
    const userInst = await execSQLQuery(sqlQuery);
    return userInst.length ? userInst[0] : null;
  }

  async registerUser(reqData) {
    const sqlQuery = `INSERT INTO users (customer_name, mobile, gender) VALUES ('${reqData.name}', '${reqData.mobile}', '${reqData.gender}');`;
    const userInst = await execSQLQuery(sqlQuery);
    return userInst;
  }

  async saveOtp(mobile, otp, type) {
    const sqlQuery = `INSERT INTO otp (otp, user_id, type, count, expires_at) VALUES 
    ('${otp}', (SELECT id FROM users WHERE mobile = '${mobile}'), '${type}', 0, CURRENT_TIMESTAMP + (5 * INTERVAL '1 minute'))
    ON CONFLICT (user_id) DO UPDATE SET otp = '${otp}', type = '${type}', count = otp.count + 1, expires_at = CURRENT_TIMESTAMP + (5 * INTERVAL '1 minute'),
    updated_at = NOW();`;
    const otpInst = await execSQLQuery(sqlQuery);
    return otpInst;
  }

  async verifyOtp(mobile) {
    const txnQueries = [
      `UPDATE users SET is_mobile_verified = true, updated_at = NOW() WHERE mobile = '${mobile}';`,
      `UPDATE otp SET expires_at = null, type = null, count = 0, otp = null, updated_at = NOW() 
        WHERE user_id = (SELECT id FROM users WHERE mobile = '${mobile}');`
    ];
    await execSQLTxn(txnQueries);
  }

  async updateProfile(userId, reqData) {
    const sqlQuery = `INSERT INTO user_profile (user_id, account_number, ifsc, account_type, pan, employment_type, monthly_income) VALUES 
      (${userId}, '${reqData.accountNumber}', '${reqData.ifsc}', '${reqData.accountType}', '${reqData.pan}', '${reqData.employmentType}', '${reqData.monthlyIncome}')
      ON CONFLICT (user_id) DO UPDATE SET account_number = '${reqData.accountNumber}', ifsc = '${reqData.ifsc}', account_type = '${reqData.accountType}',
      pan = '${reqData.pan}', employment_type = '${reqData.employmentType}', monthly_income = '${reqData.monthlyIncome}', updated_at = NOW();`;
    await execSQLQuery(sqlQuery);
  }

  async getProfileInfo(userId) {
    const sqlQuery = `SELECT account_number "accountNumber", ifsc, account_type "accountType", pan, employment_type "employmentType", monthly_income "monthlyIncome" 
        FROM user_profile WHERE user_id = ${userId};`;
    const userInst = await execSQLQuery(sqlQuery);
    return userInst.length ? userInst[0] : null;
  }

  async getLatestLoan(userId) {
    const sqlQuery = `SELECT id, status, amount, type, tenure_in_months AS "loanTenureInMonths",
        FLOOR((EXTRACT(EPOCH FROM (current_timestamp - created_at)))/3600) as "loanCreationTimeLapsedInHours"
        FROM loan WHERE user_id = ${userId} ORDER BY id DESC LIMIT 1;`;
    const [loanInst] = await execSQLQuery(sqlQuery);
    return loanInst;
  }

  async createNewLoan(userId, reqData) {
    const sqlQuery = `INSERT INTO loan (user_id, type, amount, tenure_in_months, status) VALUES (${userId}, '${reqData.loanType}',
        '${reqData.loanAmount}', '${reqData.loanTenureInMonths}', 'Pending');`;
    await execSQLQuery(sqlQuery);
  }

  async cancelLoan(userId, loanId) {
    const sqlQuery = `UPDATE loan SET status = 'Cancelled' WHERE id = ${loanId} AND user_id = ${userId}`;
    await execSQLQuery(sqlQuery);
  }

  async actionUpdateOnLoan(userId, reqData) {
    let status = null;
    if (reqData.status === 'Disburse') status = 'Disbursed';
    else status = 'Declined';
    const sqlQuery = `UPDATE loan SET status = '${status}' WHERE user_id = ${userId} AND id = ${reqData.loanId};`;
    await execSQLQuery(sqlQuery);
  }

  async getLoanDetails(userId, loanId) {
    const sqlQuery = `SELECT id, status, user_id AS "userId", FLOOR((EXTRACT(EPOCH FROM (current_timestamp - created_at)))/3600) as "loanCreationTimeLapsedInHours"
        FROM loan WHERE user_id = ${userId} AND id = ${loanId};`;
    const loanInst = await execSQLQuery(sqlQuery);
    return loanInst.length ? loanInst[0] : null;
  }

  async updateDocuments(userId, loanId, docType, fileName) {
    const sqlQuery = `INSERT INTO user_documents (user_id, loan_id, type, url) VALUES (${userId}, ${loanId}, '${docType}', '${fileName}')
        ON CONFLICT (loan_id, type) DO UPDATE SET type = '${docType}', url = '${fileName}', updated_at = NOW();`;
    await execSQLQuery(sqlQuery);
  }

  async getAllDocs(userId, loanId) {
    const sqlQuery = `SELECT id, type, url FROM user_documents WHERE user_id = ${userId} AND loan_id = ${loanId};`;
    const docInst = await execSQLQuery(sqlQuery);
    return docInst;
  }

  async approveDocsAndLoan(userId, loanId) {
    const txnQueries = [
      `UPDATE loan SET status = 'Approved', roi = 8, amount_approved = amount, updated_at = NOW() WHERE user_id = ${userId} AND id = ${loanId};`,
      `UPDATE user_documents SET is_approved = true WHERE loan_id = ${loanId} AND user_id = ${userId};`
    ];
    await execSQLTxn(txnQueries);
  }

  async rejectLoan(userId, loanId) {
    const sqlQuery = `UPDATE loan SET status = 'Rejected', updated_at = NOW() WHERE user_id = ${userId} AND id = ${loanId};`;
    await execSQLQuery(sqlQuery);
  }
}

module.exports = new RidesQuery();
