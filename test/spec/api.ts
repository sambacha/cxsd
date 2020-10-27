import * as cxml from "@wikipathways/cxml";
import * as gpml from "../xmlns/pathvisio.org/GPML/2013a";
const fs = require("fs");
const path = require("path");

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10 * 1000; // 10 second timeout

test("Attach handler w/ _before & _after. Parse stream.", () => {
  expect.assertions(6);

  const parser = new cxml.Parser();

  parser.attach(
    class CustomHandler extends gpml.document.Pathway.constructor {
      _before() {
        expect(this.Name).toBe("one of each - test pathway for development");
      }

      _after() {
        expect(this.Name).toBe("one of each - test pathway for development");
        expect(typeof this.Graphics).toBe("object");
      }
    }
  );

  return parser
    .parse(
      fs.createReadStream(path.resolve(__dirname, "../input/one-of-each.gpml")),
      gpml.document
    )
    .then(doc => {
      expect(typeof doc).toBe("object");
      expect(typeof doc.Pathway).toBe("object");
      expect(doc.Pathway.Name).toBe(
        "one of each - test pathway for development"
      );
    });
});

test("/Pathway/DataNode vs. /Pathway/Shape constructors are different", () => {
  expect(gpml.document.Pathway.DataNode[0].constructor).not.toBe(
    gpml.document.Pathway.Shape[0].constructor
  );
});

test("/Pathway/Comment & /Pathway/Comment constructors are the same", () => {
  expect(gpml.document.Pathway.Comment[0].constructor).toBe(
    gpml.document.Pathway.Comment[0].constructor
  );
});

console.warn(
  "TODO: cxml/cxsd not path aware (can't differentiate between levels)."
);
// TODO re-enable this test when cxml/cxsd combo is path aware
//test("/Pathway/Comment vs. /Pathway/DataNode/Comment constructors are different", () => {
//  expect(gpml.document.Pathway.Comment[0].constructor).not.toEqual(
//    gpml.document.Pathway.DataNode[0].Comment[0].constructor
//  );
//});
