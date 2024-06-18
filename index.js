const express = require("express");
const axios = require("axios");
const app = express();
const port = 4000;
const uniqid = require("uniqid");
const sha256 = require("sha256");

//TESTING
const PHONE_PAY_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = "PGTESTPAYUAT86";
const SALT_INDEX = 1;
// const SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";

app.get("/start", (req, res) => {
  res.send("phonepe app is working");
});

app.get("/pay", (req, res) => {
  const payEndPoint = "/pg/v1/pay";
  merchantTransactionId = uniqid();
  const userId = 123;
  //console.log(req.body);

  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: 100,
    redirectUrl: `http://localhost:4000/redirect-url/${merchantTransactionId}`,
    redirectMode: "REDIRECT",
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };
  /*SHA256(base64 encoded payload + “/pg/v1/pay” +
salt key) + ### + salt index*/
  const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
  const base63EncodedPayload = bufferObj.toString("base64");
  const xVerify =
    sha256(base63EncodedPayload + payEndPoint + SALT_KEY) + "###" + SALT_INDEX;
  console.log("----" + base63EncodedPayload);
  //console.log(xVerify);

  const options = {
    method: "post",
    url: `${PHONE_PAY_HOST_URL}${payEndPoint}`,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-VERIFY": xVerify,
    },
    data: {
      request: base63EncodedPayload,
    },
  };

  axios
    .post(
      `${PHONE_PAY_HOST_URL}/pg/v1/pay`,
      {
        request: base63EncodedPayload,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          accept: "application/json",
        },
      }
    )
    .then(function (response) {
      const url = response.data.data.instrumentResponse.redirectInfo.url;
      console.log(url);
      res.redirect(url);
    })
    .catch(function (error) {
      console.error(error);
    });
});

app.get("/redirect-url/:id", (req, res) => {
  const merchantTransactionId = req.params.id;
  console.log(merchantTransactionId);

  if (merchantTransactionId) {
    //SHA256(“/pg/v1/status/{merchantId}/{merchantTransactionId}” + saltKey) + “###” + saltIndex
    const xVerify=sha256(`/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`+SALT_KEY)+"###"+SALT_INDEX
    const options = {
      method: "get",
    url: `${PHONE_PAY_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-MERCHANT-ID":merchantTransactionId,
        "X-VERIFY":xVerify
      },
    };
    axios
      .request(options)
      .then(function (response) {
        console.log(response.data);
        if(response.data.code==="PAYMENT_SUCESS"){
          console.log("payment sucess");
        }else if(response.data.code==="PAYMENT_ERROR"){
        //redirect user to front error for error
          res.send("invalid format")

        }
        res.send(response.data)
      })
      .catch(function (error) {
        console.error(error);
      });
    //res.send(merchantTransactionId);
  } else {
    res.send("error");
  }
});

app.listen(port, () => {
  console.log("server is running on port 4000");
});
