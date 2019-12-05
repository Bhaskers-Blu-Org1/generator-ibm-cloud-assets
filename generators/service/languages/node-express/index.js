'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-node-express");
const path = require('path');
let Generator = require('yeoman-generator');
const fs = require('fs');

const Utils = require('../../../lib/utils');
const scaffolderMapping = require('../../templates/scaffolderMapping.json');

const GENERATE_HERE = "// GENERATE HERE";
const GENERATOR_LOCATION = 'server';
const PATH_MAPPINGS_FILE = "./server/config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";
const PATH_PACKAGE_JSON = "./package.json";

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug("Constructing");
	}

	configuring(){
		this.context.dependenciesFile = "dependencies.json";
		this.context.languageFileExt = ".js";
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addDependencies = this._addDependencies.bind(this);
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);

		let serviceCredentials,
			scaffolderKey,
			serviceKey;
		this._addDependencies(this.fs.read(this.templatePath() + "/" + this.context.dependenciesFile));

		//initializing ourselves by composing with the service generators
		let root = path.dirname(require.resolve('../..'));
		let folders = fs.readdirSync(root);
		folders.forEach(folder => {
			if (folder.startsWith('service-')) {
				serviceKey = folder.substring(folder.indexOf('-') + 1);
				scaffolderKey = scaffolderMapping[serviceKey];
				serviceCredentials = Array.isArray(this.context.bluemix[scaffolderKey])
					? this.context.bluemix[scaffolderKey][0] : this.context.bluemix[scaffolderKey];
				logger.debug("Composing with service : " + folder);
				try {
					this.context.cloudLabel = serviceCredentials && serviceCredentials.serviceInfo && serviceCredentials.serviceInfo.cloudLabel;
					this.composeWith(path.join(root, folder), {context: this.context});
				} catch (err) {
					/* istanbul ignore next */	//ignore for code coverage as this is just a warning - if the service fails to load the subsequent service test will fail
					logger.warn('Unable to compose with service', folder, err);
				}
			}
		});
	}

	writing() {
		// this.fs.copy(
		// 	this.templatePath() + "/service-manager.js",
		// 	this.destinationPath("./server/services/service-manager.js")
		// );

		// this.fs.copy(
		// 	this.templatePath() + "/services-index.js",
		// 	this.destinationPath("./server/services/index.js")
		// );
	}

	_addDependencies(serviceDepdendenciesString){
		let serviceDependencies = JSON.parse(serviceDepdendenciesString);
		let packageJsonPath = this.destinationPath(PATH_PACKAGE_JSON);
		this.fs.extendJSON(packageJsonPath, serviceDependencies);
	}

	_addMappings(serviceMappingsJSON){
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

	_addLocalDevConfig(serviceLocalDevConfigJSON){
		let localDevConfigFilePath = this.destinationPath(PATH_LOCALDEV_CONFIG_FILE);
		this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
	}

	end(){
		// Remove GENERATE_HERE from /server/services/index.js
		let servicesIndexJsFilePath = this.destinationPath("./server/services/index.js");
		if (this.fs.exists(servicesIndexJsFilePath)) {
			let indexFileContent = this.fs.read(servicesIndexJsFilePath);
			indexFileContent = indexFileContent.replace(GENERATE_HERE, "");
			this.fs.write(servicesIndexJsFilePath, indexFileContent);
		}
	}
};
