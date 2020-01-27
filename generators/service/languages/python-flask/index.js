'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-cloud-assets:languages-python-flask");
let Generator = require('yeoman-generator');
const fs = require('fs');
const path = require('path');

const Utils = require('../../../lib/utils');
const Handlebars = require('../../../lib/handlebars.js');
const scaffolderMapping = require('../../templates/scaffolderMapping.json');
const svcInfo = require('../../templates/serviceInfo.json');

const GENERATE_HERE = "# GENERATE HERE";
const GENERATOR_LOCATION = 'server';
const GENERATE_IMPORT_HERE = "# GENERATE IMPORT HERE";
const PATH_MAPPINGS_FILE = "./server/config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";
const PATH_REQUIREMENTS_TXT = "./requirements.txt";
const PATH_PIPFILE_JSON = "/Pipfile.json";
const PATH_GIT_IGNORE = "./.gitignore";
const PATH_PIPFILE = 'Pipfile';
const SERVICES_INIT_FILE = "__init__.py";
const SOURCES = '[[source]]';
const DEV_PACKAGES = '[dev-packages]';
const PACKAGES = '[packages]';
const SOURCES_CONTENT = "url = \"https://pypi.python.org/simple\"\n" +
	"verify_ssl = true\n" +
	"name = \"pypi\"";

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug("Constructing");
	}

	configuring() {
		this.context.dependenciesFile = ["requirements.txt", "Pipfile.json"];
		this.context.languageFileExt = ".py";
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addDependencies = this._addDependencies.bind(this);
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
	}

	writing() {
		for (let i = 0; i < this.context.dependenciesFile.length; i++) {
			this._addDependencies(this.fs.read(this.templatePath() + "/" + this.context.dependenciesFile[i]));
		}

		/*
		this.fs.copy(
			this.templatePath() + "/service_manager.py",
			this.destinationPath("./server/services/service_manager.py")
		);

		this.fs.copy(
			this.templatePath() + "/services_index.py",
			this.destinationPath("./server/services/" + SERVICES_INIT_FILE)
		);
		*/

		let serviceCredentials,
			serviceKey;
		//initializing ourselves by composing with the service enabler
		let root = path.dirname(require.resolve('../../enabler'));
		Object.keys(svcInfo).forEach(svc => {
			serviceKey = svc;
			serviceCredentials = this.context.application.service_credentials[serviceKey];
			if (serviceCredentials) {
				this.context.scaffolderKey = serviceKey;
				logger.debug("Composing with service : " + svc);
				try {
					this.context.cloudLabel = serviceCredentials && serviceCredentials.serviceInfo && serviceCredentials.serviceInfo.cloudLabel;
					this.composeWith(root, {context: this.context});
				} catch (err) {
					/* istanbul ignore next */	//ignore for code coverage as this is just a warning - if the service fails to load the subsequent service test will fail
					logger.warn('Unable to compose with service', svc, err);
				}
			}
		});
	}

	_addDependencies(serviceDepdendenciesString) {
			//moving away from injecting dependencies via generators
	}

	//only called when Pipfile doesn't exist
	_createPipfile(serviceDepdendenciesString) {
		let sourcesContent,
			devPackagesContent,
			packagesContent;
		//stuff that will go into user's pipfile
		let pipfileText = SOURCES + '\n' + SOURCES_CONTENT + '\n';
		//pipfile info from service
		let parsedJson = JSON.parse(serviceDepdendenciesString);
		sourcesContent = parsedJson[SOURCES];

		let keys = Object.keys(sourcesContent);
		for (let i = 0; i < keys.length; i++) {
			let snippet = `${keys[i]} ='${sourcesContent[keys[i]]}'`;
			pipfileText += snippet + '\n';
		}
		devPackagesContent = parsedJson[DEV_PACKAGES];
		// add sources from the json
		pipfileText += '[dev-packages]' + '\n';
		keys = Object.keys(devPackagesContent);
		for (let i = 0; i < keys.length; i++) {
			let snippet = `${keys[i]} ='${devPackagesContent[keys[i]]}'`;
			pipfileText += snippet + '\n';
		}
		packagesContent = parsedJson[PACKAGES];
		pipfileText += '[packages]' + '\n';
		keys = Object.keys(packagesContent);
		for (let i = 0; i < keys.length; i++) {
			let snippet = `${keys[i]} ='${packagesContent[keys[i]]}'`;
			pipfileText += snippet + '\n';
		}
		return pipfileText;
	}

	//add service info to an existing pipfile
	_addServiceToPipfile(languageJson, serviceJson, userPipfile, packageType) {
		//if the json isn't empty
		if (serviceJson.length > 2) {
			let content = languageJson[packageType];
			let keys = Object.keys(content);
			//go through the json object and check the packageType pipfile snippet in the languageJson
			for (let i = 0; i < keys.length; i++) {
				//get the pipfile snippet
				let snippet = `${keys[i]} ='${content[keys[i]]}'`;
				//see if that pipfile snippet is in the user's Pipfile.json
				if (userPipfile.indexOf(snippet) === -1) {
					//add the snippet to the user's pipfile
					let splitArray = userPipfile.split(`${packageType}\n`);

					userPipfile = splitArray[0] + '[packages]\n' + `${snippet}\n` + splitArray[1];


				} else {
					// snippet does not exist in Pipfile.json append
					logger.debug(`${userPipfile} is already in Pipfile file, not appending`);
				}
			}
			content = JSON.parse(serviceJson)[packageType];
			keys = Object.keys(content);
			for (let i = 0; i < keys.length; i++) {

				let snippet = `${keys[i]} ='${content[keys[i]]}'`;

				if (userPipfile.indexOf(snippet) === -1) {
					//add the source to the pipfile
					let splitArray = userPipfile.split(`${packageType}\n`);
					userPipfile = splitArray[0] + '[packages]\n' + `${snippet}\n` + splitArray[1];

				} else {
					logger.debug(`${userPipfile} is already in Pipfile file, not appending`);
				}
			}

			return userPipfile;
		}
		//just use the Pipfile already in the user directory
		else {
			return userPipfile;
		}
	}

	_addMappings(serviceMappingsJSON) {
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

	_addLocalDevConfig(serviceLocalDevConfigJSON) {
		let localDevConfigFilePath = this.destinationPath(PATH_LOCALDEV_CONFIG_FILE);
		this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
	}

	_writeHandlebarsFile(templateFile, destinationFile, data) {
		let template = this.fs.read(this.templatePath(templateFile));
		let compiledTemplate = Handlebars.compile(template);
		let output = compiledTemplate(data);
		this.fs.write(this.destinationPath(destinationFile), output);
	}

	end() {
		// Remove GENERATE_HERE and GENERATE_IMPORT_HERE from SERVICES_INIT_FILE
		/*
		let servicesInitFilePath = this.destinationPath("./server/services/" + SERVICES_INIT_FILE);
		let indexFileContent = this.fs.read(servicesInitFilePath);
		indexFileContent = indexFileContent.replace(GENERATE_HERE, "").replace(GENERATE_IMPORT_HERE, "");
		this.fs.write(servicesInitFilePath, indexFileContent);
		*/
	}
};
