/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import {
  Live2DCubismFramework as live2dcubismframework,
  Option as Csm_Option,
} from "./Framework/live2dcubismframework";
import Csm_CubismFramework = live2dcubismframework.CubismFramework;
import { LAppView } from "./lappview";
import { LAppPal } from "./lapppal";
import { LAppTextureManager } from "./lapptexturemanager";
import { LAppLive2DManager } from "./lapplive2dmanager";
import * as LAppDefine from "./lappdefine";
import * as dialog from "./dialog";

import { config } from "./config/configMgr";
import { L2Dwidget } from "./index";

export let canvas: HTMLCanvasElement = null;
export let s_instance: LAppDelegate = null;
export let gl: WebGLRenderingContext = null;
export let frameBuffer: WebGLFramebuffer = null;

/**
 * アプリケーションクラス。
 * Cubism SDKの管理を行う。
 */
export class LAppDelegate {
  /**
   * クラスのインスタンス（シングルトン）を返す。
   * インスタンスが生成されていない場合は内部でインスタンスを生成する。
   *
   * @return クラスのインスタンス
   */
  public static getInstance(): LAppDelegate {
    if (s_instance == null) {
      s_instance = new LAppDelegate();
    }

    return s_instance;
  }

  /**
   * クラスのインスタンス（シングルトン）を解放する。
   */
  public static releaseInstance(): void {
    if (s_instance != null) {
      s_instance.release();
    }

    s_instance = null;
  }

  /**
   * APPに必要な物を初期化する。
   */
  public initialize(): boolean {
    let e = document.getElementById(config.name.div);
    if (e !== null) {
      document.body.removeChild(e);
    }

    let newElem = document.createElement("div");
    newElem.id = config.name.div;
    newElem.className = "live2d-widget-container";
    newElem.style.setProperty("position", "fixed");
    newElem.style.setProperty(
      config.display.position,
      config.display.hOffset + "px"
    );
    newElem.style.setProperty("bottom", config.display.vOffset + "px");
    newElem.style.setProperty("width", config.display.width + "px");
    newElem.style.setProperty("height", config.display.height + "px");
    newElem.style.setProperty("z-index", "99999");
    newElem.style.setProperty("opacity", config.react.opacity);
    newElem.style.setProperty("pointer-events", "none");
    document.body.appendChild(newElem);
    L2Dwidget.emit("create-container", newElem);

    if (config.dialog.enable) {
      dialog.createDialogElement(newElem);
    }

    canvas = document.createElement("canvas");
    canvas.setAttribute("id", config.name.canvas);
    canvas.setAttribute(
      "width",
      (config.display.width * config.display.superSample).toString()
    );
    canvas.setAttribute(
      "height",
      (config.display.height * config.display.superSample).toString()
    );
    canvas.style.setProperty("position", "absolute");
    canvas.style.setProperty("left", "0px");
    canvas.style.setProperty("top", "0px");
    canvas.style.setProperty("width", config.display.width + "px");
    canvas.style.setProperty("height", config.display.height + "px");
    if (config.dev.border)
      canvas.style.setProperty("border", "dashed 1px #CCC");
    canvas.width = config.display.width;
    canvas.height = config.display.height;

    // L2Dwidget.emit("create-canvas", canvas);
    newElem.appendChild(canvas);
    L2Dwidget.emit("create-canvas", canvas);

    // @ts-ignore
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) {
      alert("Cannot initialize WebGL. This browser does not support.");
      gl = null;

      document.body.innerHTML =
        "This browser does not support the <code>&lt;canvas&gt;</code> element.";

      // gl初期化失敗
      return false;
    }

    if (!frameBuffer) {
      frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    }

    // 透過設定
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const supportTouch: boolean = "ontouchend" in canvas;

    // window.addEventListener("click", mouseEvent);
    window.addEventListener("mousedown", onClickBegan);
    window.addEventListener("mousemove", onMouseMoved);
    window.addEventListener("mouseup", onClickEnded);
    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchstart", onTouchBegan);
    window.addEventListener("touchend", onTouchEnded);
    window.addEventListener("touchmove", onTouchMoved);
    window.addEventListener("touchcancel", onTouchCancel);
    // if (supportTouch) {
    //   // タッチ関連コールバック関数登録
    //   canvas.ontouchstart = onTouchBegan;
    //   canvas.ontouchmove = onTouchMoved;
    //   canvas.ontouchend = onTouchEnded;
    //   canvas.ontouchcancel = onTouchCancel;
    // } else {
    //   // マウス関連コールバック関数登録
    //   canvas.onmousedown = onClickBegan;
    //   canvas.onmousemove = onMouseMoved;
    //   canvas.onmouseup = onClickEnded;
    // }

    // AppViewの初期化
    this._view.initialize();

    // Cubism SDKの初期化
    this.initializeCubism();

    return true;
  }

  /**
   * 解放する。
   */
  public release(): void {
    this._textureManager.release();
    this._textureManager = null;

    this._view.release();
    this._view = null;

    // リソースを解放
    LAppLive2DManager.releaseInstance();

    // Cubism SDKの解放
    Csm_CubismFramework.dispose();
  }

  /**
   * 実行処理。
   */
  public run(): void {
    // メインループ
    const loop = (): void => {
      // インスタンスの有無の確認
      if (s_instance == null) {
        return;
      }

      // 時間更新
      LAppPal.updateTime();

      // 画面の初期化
      //gl.clearColor(0.0, 0.0, 0.0, 1.0);

      // 深度テストを有効化
      gl.enable(gl.DEPTH_TEST);

      // 近くにある物体は、遠くにある物体を覆い隠す
      gl.depthFunc(gl.LEQUAL);

      // カラーバッファや深度バッファをクリアする
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.clearDepth(1.0);

      // 透過設定
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // 描画更新
      this._view.render();

      // ループのために再帰呼び出し
      requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * シェーダーを登録する。
   */
  public createShader(): WebGLProgram {
    // バーテックスシェーダーのコンパイル
    const vertexShaderId = gl.createShader(gl.VERTEX_SHADER);

    if (vertexShaderId == null) {
      LAppPal.printMessage("failed to create vertexShader");
      return null;
    }

    const vertexShader: string =
      "precision mediump float;" +
      "attribute vec3 position;" +
      "attribute vec2 uv;" +
      "varying vec2 vuv;" +
      "void main(void)" +
      "{" +
      "   gl_Position = vec4(position, 1.0);" +
      "   vuv = uv;" +
      "}";

    gl.shaderSource(vertexShaderId, vertexShader);
    gl.compileShader(vertexShaderId);

    // フラグメントシェーダのコンパイル
    const fragmentShaderId = gl.createShader(gl.FRAGMENT_SHADER);

    if (fragmentShaderId == null) {
      LAppPal.printMessage("failed to create fragmentShader");
      return null;
    }

    const fragmentShader: string =
      "precision mediump float;" +
      "varying vec2 vuv;" +
      "uniform sampler2D texture;" +
      "void main(void)" +
      "{" +
      "   gl_FragColor = texture2D(texture, vuv);" +
      "}";

    gl.shaderSource(fragmentShaderId, fragmentShader);
    gl.compileShader(fragmentShaderId);

    // プログラムオブジェクトの作成
    const programId = gl.createProgram();
    gl.attachShader(programId, vertexShaderId);
    gl.attachShader(programId, fragmentShaderId);

    gl.deleteShader(vertexShaderId);
    gl.deleteShader(fragmentShaderId);

    // リンク
    gl.linkProgram(programId);

    gl.useProgram(programId);

    return programId;
  }

  /**
   * View情報を取得する。
   */
  public getView(): LAppView {
    return this._view;
  }

  public getTextureManager(): LAppTextureManager {
    return this._textureManager;
  }

  /**
   * コンストラクタ
   */
  constructor() {
    this._captured = false;
    this._mouseX = 0.0;
    this._mouseY = 0.0;
    this._isEnd = false;

    this._cubismOption = new Csm_Option();
    this._view = new LAppView();
    this._textureManager = new LAppTextureManager();
  }

  /**
   * Cubism SDKの初期化
   */
  public initializeCubism(): void {
    // setup cubism
    this._cubismOption.logFunction = LAppPal.printMessage;
    this._cubismOption.loggingLevel = LAppDefine.CubismLoggingLevel;
    Csm_CubismFramework.startUp(this._cubismOption);

    // initialize cubism
    Csm_CubismFramework.initialize();

    // load model
    LAppLive2DManager.getInstance();

    LAppPal.updateTime();

    this._view.initializeSprite();
  }

  _cubismOption: Csm_Option; // Cubism SDK Option
  _view: LAppView; // View情報
  _captured: boolean; // クリックしているか
  _mouseX: number; // マウスX座標
  _mouseY: number; // マウスY座標
  _isEnd: boolean; // APP終了しているか
  _textureManager: LAppTextureManager; // テクスチャマネージャー
}

/**
 * クリックしたときに呼ばれる。
 */
function onClickBegan(e: MouseEvent): void {
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage("view notfound");
    return;
  }
  LAppDelegate.getInstance()._captured = true;

  const posX: number = e.pageX;
  const posY: number = e.pageY;

  LAppDelegate.getInstance()._view.onTouchesBegan(posX, posY);
}

/**
 * マウスポインタが動いたら呼ばれる。
 */
function onMouseMoved(e: MouseEvent): void {
  // if (!LAppDelegate.getInstance()._captured) {
  //   return;
  // }

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage("view notfound");
    return;
  }

  const rect = canvas.getBoundingClientRect()
  const posX: number = e.clientX - rect.left;
  const posY: number = e.clientY - rect.top;

  LAppDelegate.getInstance()._view.onTouchesMoved(posX, posY);
}

/**
 * クリックが終了したら呼ばれる。
 */
function onClickEnded(e: MouseEvent): void {
  LAppDelegate.getInstance()._captured = false;
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage("view notfound");
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();
  const posX: number = e.clientX - rect.left;
  const posY: number = e.clientY - rect.top;

  LAppDelegate.getInstance()._view.onTouchesEnded(posX, posY);
}

/**
 * タッチしたときに呼ばれる。
 */
function onTouchBegan(e: TouchEvent): void {
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage("view notfound");
    return;
  }

  LAppDelegate.getInstance()._captured = true;

  const posX = e.changedTouches[0].pageX;
  const posY = e.changedTouches[0].pageY;

  LAppDelegate.getInstance()._view.onTouchesBegan(posX, posY);
}

/**
 * スワイプすると呼ばれる。
 */
function onTouchMoved(e: TouchEvent): void {
  if (!LAppDelegate.getInstance()._captured) {
    return;
  }

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage("view notfound");
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();

  const posX = e.changedTouches[0].clientX - rect.left;
  const posY = e.changedTouches[0].clientY - rect.top;

  LAppDelegate.getInstance()._view.onTouchesMoved(posX, posY);
}

/**
 * タッチが終了したら呼ばれる。
 */
function onTouchEnded(e: TouchEvent): void {
  LAppDelegate.getInstance()._captured = false;

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage("view notfound");
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();

  const posX = e.changedTouches[0].clientX - rect.left;
  const posY = e.changedTouches[0].clientY - rect.top;

  LAppDelegate.getInstance()._view.onTouchesEnded(posX, posY);
}

/**
 * タッチがキャンセルされると呼ばれる。
 */
function onTouchCancel(e: TouchEvent): void {
  LAppDelegate.getInstance()._captured = false;

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage("view notfound");
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();

  const posX = e.changedTouches[0].clientX - rect.left;
  const posY = e.changedTouches[0].clientY - rect.top;

  LAppDelegate.getInstance()._view.onTouchesEnded(posX, posY);
}

function onMouseLeave(e: TouchEvent): void {
  LAppDelegate.getInstance()._captured = false;
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage("view notfound");
    return;
  }
  LAppDelegate.getInstance()._view.onTouchesEnded(0, 0);
}
