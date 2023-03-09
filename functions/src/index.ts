const serviceAccount = require("../serviceAccountKey.json");
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const adminDb = admin.firestore();

const fetchResults = async (id: string): Promise<unknown> => {
  const api_key = process.env.BRIGHTDATA_API_KEY;

  const res = await fetch(`https://api.brightdata.com/dca/dataset?id=${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${api_key}`,
    },
  });

  const data = await res.json();

  if (data.status === "building" || data.status === "collecting") {
    // console.log("NOT COMPLETE YET, TRYING AGAIN...");
    return fetchResults(id);
  }

  return data;
};

export const onScraperComplete = functions.https.onRequest(
  async (request, response) => {
    // console.log("SCRAPE COMPLETE >>> : ", request.body);

    const { success, id, finished } = request.body;

    if (!success) {
      await adminDb.collection("searches").doc(id).set(
        {
          status: "error",
          //TODO: admin.firestore.Timestamp.now() is undefined
          updatedAt: finished,
        },
        {
          merge: true,
        }
      );
    }

    const data = await fetchResults(id);

    await adminDb.collection("searches").doc(id).set(
      {
        status: "complete",
        //TODO: admin.firestore.Timestamp.now() is undefined
        updatedAt: finished,
        results: data,
      }, {
        merge: true,
      }
    )

    // console.log("SCRAPE COMPLETE >>> : ", data);

    response.send("Scraping Function Complete");
  }
);
// https://60e0-190-15-220-255.sa.ngrok.io/brightdata-build-19bfe/us-central1/onScraperComplete
