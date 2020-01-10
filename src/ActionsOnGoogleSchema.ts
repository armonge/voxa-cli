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
                      source: value,
                      target: translation,
                      note: "",
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
            note: "",
            additionalAttributes: {
              resname: key
            }
          }
        ];
      })
      .fromPairs()
      .value();

    console.log(this.interactionOptions);

    const xliffObject = {
      datatype: "x-undefined",
      sourceLanguage: this.interactionOptions.sourceLanguage,
      targetLanguage: locale,
      resources: {
        "agent.proto": xliffUnits
      }
    };

    const xliff = `<?xml version="1.0" encoding="UTF-8" ?>\n${jsToXliff12(xliffObject, {
      xmlLangAttr: true
    })}\n`;
    this.fileContent.push({
      path: path.join(
        this.interactionOptions.rootPath,
        this.interactionOptions.speechPath,
        this.NAMESPACE,
        _.kebabCase(environment),
        `${locale}.xlf`
      ),
      content: xliff
    });
  }

  buildPublishing(locale: string, environment: string) {
    const manifest = this.mergeManifest(environment);
    return manifest[locale];
  }
}
