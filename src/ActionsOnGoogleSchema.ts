import path from "path";
import _ from "lodash";
import bluebird from "bluebird";
import { Schema } from "./Schema";
import { AVAILABLE_LOCALES } from "./DialogflowSchema";
import { IVoxaSheet } from "./VoxaSheet";

import { jsToXliff12 } from "xliff";

const NAMESPACE = "actionsOnGoogle";

export class ActionsOnGoogleSchema extends Schema {
  public environment = "staging";

  constructor(voxaSheets: IVoxaSheet[], interactionOptions: any) {
    super(NAMESPACE, AVAILABLE_LOCALES, voxaSheets, interactionOptions);
  }

  public validate() {}
  async build(locale: string, environment: string) {
    const manifest = this.buildPublishing(locale, environment);

    let index = 0;
    let groupIndex = 0;
    const xliffUnits = _(manifest)
      .map((value, key) => {
        if (_.isArray(value)) {
          groupIndex += 1;
          return [
            `grpId${groupIndex}`,
            {
              additionalAttributes: {
                resname: key
              },
              groupUnits: _(value)
                .map((translation, groupIndex) => {
                  index += 1;
                  return [
                    `tu${index}`,
                    {
                      source: translation,
                      target: translation,
                      additionalAttributes: {
                        resname: `${key}.${groupIndex + 1}`
                      }
                    }
                  ];
                })
                .fromPairs()
                .value()
            }
          ];
        }
        index += 1;
        return [
          `tu${index}`,
          {
            source: value,
            target: value,
            additionalAttributes: {
              resName: key
            }
          }
        ];
      })
      .fromPairs()
      .value();

    const xliffObject = {
      sourceLanguage: locale,
      targetLanguage: locale,
      resources: {
        "agent.proto": xliffUnits
      }
    };

    const xliff = jsToXliff12(xliffObject, { xmlLangAttr: true });
    this.fileContent.push({
      path: path.join(
        this.interactionOptions.rootPath,
        this.interactionOptions.speechPath,
        this.NAMESPACE,
        _.kebabCase(environment),
        `${locale}.xliff`
      ),
      content: xliff
    });
  }

  buildPublishing(locale: string, environment: string) {
    const manifest = this.mergeManifest(environment);
    return manifest[locale];
  }
}
