/* eslint-disable @typescript-eslint/explicit-function-return-type */

import * as express from "express";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as packageJson from "../package.json";

import { envConfig, IConfig } from "../utils/config";
import { ApplicationInfo } from "../generated/definitions/ApplicationInfo";
import { CosmosClient } from "@azure/cosmos";

type InfoHandler = () => Promise<
  IResponseSuccessJson<ApplicationInfo> | IResponseErrorInternal
>;

type HealthChecker = (
  config: unknown
) => healthcheck.HealthCheck<"AzureStorage" | "Config" | "AzureCosmosDB", true>;

const MoreInfoHandler = (
  checkApplicationHealth: HealthChecker,
  cosmosclient: CosmosClient
): InfoHandler => (): Promise<
  IResponseSuccessJson<ApplicationInfo> | IResponseErrorInternal
> =>
  pipe(
    TE.tryCatch(
      () => cosmosclient.databases.create({ id: "sample" }),
      () => ResponseErrorInternal("errore")
    ),
    TE.map(() =>
      ResponseSuccessJson({
        version: packageJson.version,
        name: packageJson.name
      })
    ),
    TE.toUnion
  )();

export const MoreInfo = (
  cosmosclient: CosmosClient
): express.RequestHandler => {
  const handler = MoreInfoHandler(
    healthcheck.checkApplicationHealth(IConfig, [
      c => healthcheck.checkAzureCosmosDbHealth(c.COSMOSDB_URI, c.COSMOSDB_KEY),
      c => healthcheck.checkAzureStorageHealth(c.QueueStorageConnection)
    ]),
    cosmosclient
  );

  return wrapRequestHandler(handler);
};
