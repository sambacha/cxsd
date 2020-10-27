// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import "source-map-support/register";

import * as cmd from "commander";

import { Cache, FetchOptions } from "@wikipathways/cget";

import { Context } from "./xsd/Context";
import { Namespace } from "./xsd/Namespace";
import { Loader } from "./xsd/Loader";
import { exportNamespace } from "./xsd/Exporter";
import { AddImports } from "./schema/transform/AddImports";
import { Sanitize } from "./schema/transform/Sanitize";
import * as schema from "./schema";

type _ICommand = typeof cmd;
interface ICommand extends _ICommand {
  arguments(spec: string): ICommand;
}

(cmd.version(require("../package.json").version) as ICommand)
  .arguments("<url>")
  .description("XSD download and conversion tool")
  .option(
    "-L, --allow-local <boolean> (default true)",
    "Allow or disallow fetching files from local filesystem"
  )
  .option(
    "-H, --force-host <host>",
    'Fetch all xsd files from <host>\n    (original host is passed in GET parameter "host")'
  )
  .option(
    "-P, --force-port <port>",
    "Connect to <port> when using --force-host"
  )
  // .option('-c, --cache-xsd <path>', 'Cache downloaded XSD filed under <path>')
  .option("-t, --out-ts <path>", "Output TypeScript definitions under <path>")
  .option("-j, --out-js <path>", "Output JavaScript modules under <path>")
  .action(handleConvert)
  .parse(process.argv);

if (process.argv.length < 3) cmd.help();

function handleConvert(urlRemote: string, opts: { [key: string]: any }) {
  var schemaContext = new schema.Context();
  var xsdContext = new Context(schemaContext);

  var fetchOptions: FetchOptions = {};

  fetchOptions.allowLocal = opts.hasOwnProperty("allowLocal")
    ? opts["allowLocal"]
    : true;

  if (opts["forceHost"]) {
    fetchOptions.forceHost = opts["forceHost"];
    if (opts["forcePort"]) fetchOptions.forcePort = opts["forcePort"];

    Cache.patchRequest();
  }

  var jsCache = new Cache(opts["outJs"] || "xmlns", { indexName: "_index.js" });
  var tsCache = new Cache(opts["outTs"] || "xmlns", {
    indexName: "_index.d.ts"
  });

  var loader = new Loader(xsdContext, fetchOptions);

  loader.import(urlRemote).then((namespace: Namespace) => {
    try {
      exportNamespace(xsdContext.primitiveSpace, schemaContext);
      exportNamespace(xsdContext.xmlSpace, schemaContext);

      var spec = exportNamespace(namespace, schemaContext);

      var addImports = new AddImports(spec);
      var sanitize = new Sanitize(spec);

      var importsAdded = addImports.exec();

      // Find ID numbers of all types imported from other namespaces.
      importsAdded
        .then(() =>
          // Rename types to valid JavaScript class names,
          // adding a prefix or suffix to duplicates.
          sanitize.exec()
        )
        .then(() => sanitize.finish())
        .then(() => addImports.finish(importsAdded.value()))
        .then(() => new schema.JS(spec, jsCache).exec())
        .then(() => new schema.TS(spec, tsCache).exec());
    } catch (err) {
      console.error(err);
      console.log("Stack:");
      console.error(err.stack);
    }
  });
}
