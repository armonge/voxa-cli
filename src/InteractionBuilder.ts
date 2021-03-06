/* tslint:disable:no-submodule-imports no-console */
import * as _Promise from "bluebird";
import * as fsExtra from "fs-extra";
import * as _ from "lodash";
import * as path from "path";
import { AlexaSchema } from "./AlexaSchema";
import { DialogflowSchema } from "./DialogflowSchema";
import { IFileContent } from "./Schema";
import { transform } from "./Spreadsheet";
const fs = _Promise.promisifyAll(fsExtra);

function defaultOptions(interactionOption: any) {
  const rootPath = _.get(interactionOption, "rootPath");
  const spreadsheets = _.get(interactionOption, "spreadsheets");
  const speechPath = _.get(interactionOption, "speechPath", path.join(rootPath, "speech-assets"));
  const synonymPath = _.get(interactionOption, "synonymPath", path.join(rootPath, "synonyms"));
  const viewsPath = _.get(interactionOption, "viewsPath", path.join(rootPath, "app"));
  // const validate = _.get(interactionOption, 'validate', true);
  // const type = _.get(interactionOption, 'type', 'alexa');
  // const others = _.get(interactionOption, 'content', []);
  const contentPath = _.get(interactionOption, "contentPath", path.join(rootPath, "content"));
  // const localManifest = _.get(interactionOption, 'local-manifest');
  let platforms = _.get(interactionOption, "platforms", ["alexa"]);
  platforms = _.isString(platforms) ? [platforms] : platforms;

  return { rootPath, spreadsheets, speechPath, synonymPath, viewsPath, contentPath, platforms };
}
export const buildInteraction = async (interactionOptions: any, authKeys: any) => {
  interactionOptions = defaultOptions(interactionOptions);
  console.time("all");
  console.time("timeframe");
  const sheets = await transform(interactionOptions, authKeys);
  console.timeEnd("timeframe");
  // const alexa = new AlexaSchema(sheets, interactionOption);
  const platforms = interactionOptions.platforms || [];
  const schemas = [];

  if (platforms.includes("alexa")) {
    const schema = new AlexaSchema(_.cloneDeep(sheets), interactionOptions);
    schemas.push(schema);
    await fs.remove(path.join(interactionOptions.rootPath, "speech-assets/alexa"));
  }

  if (platforms.includes("dialogflow")) {
    const schema = new DialogflowSchema(_.cloneDeep(sheets), interactionOptions);
    schemas.push(schema);
    await fs.remove(path.join(interactionOptions.rootPath, "speech-assets/dialogflow"));
  }

  const fileContentsProcess = schemas
    .reduce(
      (acc, schema, index) => {
        if (index === 0) {
          schema.buildDownloads();
          schema.buildViews();
          schema.buildSynonyms();
        }

        schema.invocations.map(invoc => {
          schema.build(invoc.locale, invoc.environment);
        });
        acc = acc.concat(schema.fileContent);
        return acc;
      },
      [] as IFileContent[]
    )
    .map(file => fs.outputFile(file.path, JSON.stringify(file.content, null, 2), { flag: "w" }));

  await Promise.all(fileContentsProcess);
  console.timeEnd("all");
};
