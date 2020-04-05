// Created by xiazeyu.

/**
 * @description The manager of configeration.
 */


'use strict';

import defaultConfig from './defaultConfig';
import defaultsDeep from './defaultsDeep';
import * as core from '../Core/live2dcubismcore'

/**
 * The container of current configs
 * @type {Object}
 */

let currConfig = {};

/**
 * Apply users function, make the full settings
 * @param  {Object} [userConfig] User's custom config
 * @return {null}
 */

function configApplyer(userConfig){

  defaultsDeep(currConfig, userConfig, defaultConfig);
  // console.log('Live2Dwidget: currConfig', currConfig);

}

console.log(core.default())

export {
  configApplyer,
  currConfig as config,
}
