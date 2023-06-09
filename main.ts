import * as express from "express";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { Info } from "./Info/handler";
import { MoreInfo } from "./MoreInfo/handler";
import { AzureFunction, Context } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { Agent } from "https";

const app = express();
secureExpressApp(app);

const initCosmos = () => {
  console.log("inizializzo cosmos");

  return new CosmosClient({
    endpoint: `https://localhost:3000`,
    key: "dummy key",
    // disable SSL verification
    // since the server uses self-signed certificate
    agent: new Agent({ rejectUnauthorized: false })
  });
};

const cosmosClient = initCosmos();

// Add express route
app.get("/api/v1/info", Info());
app.get("/api/v1/moreinfo", MoreInfo(cosmosClient));

const azureFunctionHandler = createAzureFunctionHandler(app);

export const InfoFunction: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  azureFunctionHandler(context);
};
export const MoreInfoFunction: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  azureFunctionHandler(context);
};
