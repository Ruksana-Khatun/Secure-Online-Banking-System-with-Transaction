import axios from 'axios';

// ✅ Rupiksha Merchant Onboarding - NO MOCK MODE
export async function merchantOnboard(req, res) {
  try {
    const requiredFields = [
      'firstName',
      'lastName',
      'merchantPhoneNumber',
      'emailId',
      'userPan',
      'aadhaarNumber',
      'bankIfscCode',
      'merchantPinCode'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }

   
    if (!/^[6-9]\d{9}$/.test(req.body.merchantPhoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid merchant phone number'
      });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.emailId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate PAN (5 letters + 4 digits + 1 letter)
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(req.body.userPan.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN format'
      });
    }

   
    if (!/^\d{12}$/.test(req.body.aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number'
      });
    }

    
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(req.body.bankIfscCode.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IFSC code'
      });
    }

    
    if (!/^\d{6}$/.test(req.body.merchantPinCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PIN code'
      });
    }

  
    const payload = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      merchantPhoneNumber: req.body.merchantPhoneNumber,
      emailId: req.body.emailId,
      merchantAddress1: req.body.merchantAddress1 || '',
      merchantState: req.body.merchantState || '',
      merchantCityName: req.body.merchantCityName || '',
      merchantPinCode: req.body.merchantPinCode,
      companyLegalName: req.body.companyLegalName || '',
      userPan: req.body.userPan.toUpperCase(),
      aadhaarNumber: req.body.aadhaarNumber,
      companyBankAccountNumber: req.body.companyBankAccountNumber || '',
      bankIfscCode: req.body.bankIfscCode.toUpperCase(),
      companyBankName: req.body.companyBankName || '',
      bankAccountName: req.body.bankAccountName || '',
      gstNumber: req.body.gstNumber || '',

      // Hardcoded fields (NOT from form)
      merchantLoginId: `AGENT_${Date.now()}`,
      merchantLoginPin: "1234",
      merchantAddress2: "",
      merchantDistrictName: req.body.merchantCityName || '',
      companyType: "Proprietorship",
      userType: "Retailer",
      shopLatitude: "0.0",
      shopLongitude: "0.0",
      merchantPanImage: "",
      maskedAadharImage: "",
      backgroundImageOfShop: ""
    };

   
    // Call Rupiksha API - REAL API ONLY
    const rupikshaUrl = `${process.env.RUPIKSHA_BASE_URL}/aeps/onboard?userId=${process.env.RUPIKSHA_USER_ID}`;
    console.log('Calling Rupiksha API:', rupikshaUrl);
    console.log('Payload:', { ...payload, merchantPanImage: '[BASE64]', maskedAadharImage: '[BASE64]', backgroundImageOfShop: '[BASE64]' });

    const response = await axios.post(rupikshaUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds timeout
    });

    console.log('Rupiksha API Response:', response.data);
    res.json({
      success: true,
      message: 'Merchant onboarding successful',
      data: response.data
    });

  } catch (error) {
    console.error('Rupiksha API Error:', error.response?.data || error.message);
    console.error('Full Error Details:', error);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: 'Rupiksha API error',
        error: error.response.data
      });
    } else if (error.request) {
      console.error('Network Error Details:', {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      });
      
      res.status(500).json({
        success: false,
        message: 'Unable to connect to Rupiksha API',
        error: 'Network error',
        details: {
          code: error.code,
          message: 'Rupiksha API server may be down or unreachable',
          url: process.env.RUPIKSHA_BASE_URL,
          timestamp: new Date().toISOString()
        }
      });
    } else {

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}
