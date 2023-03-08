import * as functions from "firebase-functions";
import { adminDb } from "./firebaseAdmin";
import * as admin from "firebase-admin";

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
    console.log("NOT COMPETE YET, TRYING AGAIN...");
    return fetchResults(id);
  }

  return data;
};

export const onScraperComplete = functions.https.onRequest(
  async (request, response) => {
    console.log("SCRAPE COMPLETE >>> : ", request.body);

    const { success, id } = request.body;

    if (!success) {
      await adminDb.collection("searches").doc(id).set(
        {
          status: "error",
          updatedAt: admin.firestore.Timestamp.now(),
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
        updatedAt: admin.firestore.Timestamp.now(),
        results: data,
      }, {
        merge: true,
      }
    )

    response.send("Scraping Function Complete");
  }
);
// https://60e0-190-15-220-255.sa.ngrok.io/brightdata-build-19bfe/us-central1/onScraperComplete
