/* tslint:disable:no-empty no-submodule-imports */
import * as _Promise from "bluebird";
import * as _ from "lodash";
import * as path from "path";
import * as uuid from "uuid/v5";
import { AGENT, BUILT_IN_INTENTS } from "./DialogflowDefault";
import { IFileContent, IIntent, Schema } from "./Schema";
import { IVoxaSheet } from "./VoxaSheet";

export class DialogflowSchema extends Schema {
  public NAMESPACE = "dialogflow";
  public AVAILABLE_LOCALES = [
    "en",
    "de",
    "fr",
    "ja",
    "ko",
    "es",
    "pt",
    "it",
    "ru",
    "hi",
    "th",
    "id",
    "da",
    "no",
    "nl",
    "sv",
    "en-US",
    "en-AU",
    "en-CA",
    "en-IN",
    "en-GB",
    "de-DE",
    "fr-FR",
    "fr-CA",
    "ja-JP",
    "ko-KR",
    "es-ES",
    "pt-BR",
    "it-IT",
    "ru-RU",
    "hi-IN",
    "th-TH",
    "id-ID",
    "da-DK",
    "no-NO",
    "nl-NL",
    "sv-SE"
  ];
  public environment = "staging";
  public builtIntents = [] as any;

  constructor(voxaSheets: IVoxaSheet[], interactionOption: any) {
    super(interactionOption);
    this.init(voxaSheets);
  }

  public validate() {}

  public build(locale: string, environment: string) {
    this.buildIntent(locale, environment);
    this.buildUtterances(locale, environment);
    this.buildPackage(environment);
    this.buildAgent(locale, environment);
  }

  public buildPackage(environment: string) {
    const file: IFileContent = {
      path: path.join(
        this.interactionOptions.rootPath,
        "/speech-assets",
        this.NAMESPACE,
        environment,
        "package.json"
      ),
      content: {
        version: "1.0.0"
      }
    };
    this.fileContent.push(file);
  }

  public buildAgent(locale: string, environment: string) {
    const intents = this.builtIntents;
    const invocation = _.find(this.invocations, { locale, environment });
    const invocationName = _.get(invocation, "name", "Skill with no name");
    const intentsByPlatformAndEnvironments = this.intentsByPlatformAndEnvironments(
      locale,
      environment
    );

    const startIntents = _.chain(intentsByPlatformAndEnvironments)
      .filter({ startIntent: true })
      .map(intent => {
        const startIntent = _.chain(intents)
          .find(i => i.name === intent.name)
          .value();
        if (startIntent) {
          return {
            intentId: _.get(startIntent, "id"),
            signInRequired: !!_.get(startIntent, "signInRequired")
          };
        }
      })
      .compact()
      .value();

    const endIntentIds = _.chain(intentsByPlatformAndEnvironments)
      .filter({ endIntent: true })
      .map(intent => {
        const intentId = _.chain(intents)
          .find(i => i.name === intent.name)
          .get("id")
          .value();
        return intentId;
      })
      .value();

    const supportedLanguages = _(this.invocations)
      .map("locale")
      .uniq()
      .value();

    const agent = _.merge(AGENT, this.mergeManifest(environment), {
      description: invocationName,
      supportedLanguages,
      googleAssistant: { project: _.kebabCase(invocationName), startIntents, endIntentIds }
    });

    const file: IFileContent = {
      path: path.join(
        this.interactionOptions.rootPath,
        "speech-assets",
        this.NAMESPACE,
        environment,
        "agent.json"
      ),
      content: agent
    };
    this.fileContent.push(file);
  }

  public buildUtterances(locale: string, environment: string) {
    const intentsByPlatformAndEnvironments = this.intentsByPlatformAndEnvironments(
      locale,
      environment
    );

    locale = locale.split("-")[0];
    const intents = intentsByPlatformAndEnvironments.map((rawIntent: IIntent) => {
      let { name, samples, events } = rawIntent;
      const { slotsDefinition } = rawIntent;
      name = name.replace("AMAZON.", "");

      const builtInIntentSamples = _.get(BUILT_IN_INTENTS, name, []);
      samples = _.chain(samples)
        .concat(builtInIntentSamples)
        .uniq()
        .value();

      events = name === "LaunchIntent" ? ["WELCOME", "GOOGLE_ASSISTANT_WELCOME"] : events;
      events = (events as string[]).map((eventName: string) => ({ name: eventName }));

      const parameters = slotsDefinition.map(slot => ({
        dataType: _.includes(slot.type, "@sys.") ? slot.type : `@${slot.type}`,
        name: slot.name,
        value: `$${slot.name}`,
        isList: false
      }));

      const resultSamples = samples.map(sample => {
        const data = _.chain(sample)
          .replace(/{([^}]+)}/g, (match, inner) => {
            return `|{${inner}}|`;
          })
          .split("|")
          .map(text => {
            const element = {};
            const isATemplate = _.includes(text, "{") && _.includes(text, "}");

            const alias = text.replace("{", "").replace("}", "");

            const slot = _.find(parameters, { name: text });

            if (isATemplate && slot) {
              _.set(element, "meta", slot.dataType);
              _.set(element, "alias", alias);
            }

            if (!_.isEmpty(text)) {
              _.set(element, "text", text);
              _.set(element, "userDefined", isATemplate);
            }

            _.set(element, "id", hashObj(element));

            return _.isEmpty(_.omit(element, ["id"])) ? null : element;
          })
          .compact()
          .value();

        return {
          data,
          isATemplate: false,
          count: 0,
          updated: 0
        };
      });

      if (!_.isEmpty(resultSamples)) {
        const file: IFileContent = {
          path: path.join(
            this.interactionOptions.rootPath,
            "speech-assets",
            this.NAMESPACE,
            environment,
            "intents",
            `${name}_usersays_${locale}.json`
          ),
          content: resultSamples
        };
        this.fileContent.push(file);
      }
    });
  }
  public buildIntent(locale: string, environment: string) {
    const intentsByPlatformAndEnvironments = this.intentsByPlatformAndEnvironments(
      locale,
      environment
    );

    locale = locale.split("-")[0];
    this.builtIntents = intentsByPlatformAndEnvironments.map((rawIntent: IIntent) => {
      let { name, events } = rawIntent;
      const { slotsDefinition } = rawIntent;
      name = name.replace("AMAZON.", "");
      const fallbackIntent = name === "FallbackIntent";
      const action = fallbackIntent ? "input.unknown" : name;

      events = name === "LaunchIntent" ? ["WELCOME", "GOOGLE_ASSISTANT_WELCOME"] : events;
      events = (events as string[]).map((eventName: string) => ({ name: eventName }));

      const parameters = slotsDefinition.map(slot => ({
        dataType: _.includes(slot.type, "@sys.") ? slot.type : `@${slot.type}`,
        name: slot.name,
        value: `$${slot.name}`,
        isList: false
      }));

      const intent = {
        name,
        auto: true,
        contexts: [],
        responses: [
          {
            resetContexts: false,
            action,
            affectedContexts: [],
            parameters,
            messages: [],
            defaultResponsePlatforms: {},
            speech: []
          }
        ],
        priority: 500000,
        webhookUsed: true,
        webhookForSlotFilling: false,
        fallbackIntent,
        events
      };

      _.set(intent, "id", hashObj(intent));
      const file: IFileContent = {
        path: path.join(
          this.interactionOptions.rootPath,
          "speech-assets",
          this.NAMESPACE,
          environment,
          "intents",
          `${intent.name}.json`
        ),
        content: intent
      };
      this.fileContent.push(file);
      return intent;
    });
  }
}

function hashObj(obj: {}) {
  return uuid(JSON.stringify(obj), uuid.DNS);
}
