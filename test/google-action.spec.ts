/*
 * Copyright (c) 2018 Rain Agency <contact@rain.agency>
 * Author: Rain Agency <contact@rain.agency>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import _ from "lodash";
import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { configurations } from "./mocha.spec";

configurations.forEach(interactionFile => {
  if (interactionFile.name !== "Excel") {
    return;
  }
  describe(`${interactionFile.name} GoogleAction Translations`, () => {
    let xliff: string;
    let sample: string;

    before(async () => {
      const xliffPath = path.join(
        path.dirname(interactionFile.interactionFileName),
        interactionFile.speechPath,
        "actionsOnGoogle/production/en-US.xlf"
      );
      xliff = (await fs.readFile(xliffPath)).toString("utf-8");

      const samplePath = path.join(__dirname, "en-US.xlf");
      sample = (await fs.readFile(samplePath)).toString("utf-8");
    });

    it("should generate the translations for the googleaction", () => {
      expect(xliff).to.include("sampleInvocations.1");
    });

    it("should be exactly as the sample", () => {
      expect(xliff).to.equal(sample);
    });
  });
});
