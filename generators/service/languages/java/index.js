/*
 * © Copyright IBM Corp. 2017, 2018
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
const logger = require('log4js').getLogger("generator-ibm-cloud-assets:languages-java");
const Generator = require('yeoman-generator');
const ServiceUtils = require('../../../lib/service-utils');
const Utils = require('../../../lib/utils');

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.level = this.context.loggerLevel;
		logger.debug('Constructing');
	}

	//setup all the values we need to pass in the context
	initializing() {
		this.context.addMappings = ServiceUtils.addMappings.bind(this);
		this.context.addLocalDevConfig = ServiceUtils.addLocalDevConfig.bind(this);
		this.context.srcFolders = [];
		this.context.instrumentationAdded = false;
		this.context.metainf = [];
		this._addJavaDependencies = Utils.addJavaDependencies.bind(this);
		this.context.enable = ServiceUtils.enable.bind(this);

	}

	writing() {
		this.context.enable()
	}

};
