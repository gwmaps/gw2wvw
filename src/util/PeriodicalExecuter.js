/**
 * @filesource   PeriodicalExecuter.js
 * @created      03.02.2021
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2021 smiley
 * @license      MIT
 *
 * @link https://github.com/prototypejs/prototype/blob/5fddd3e/src/prototype/lang/periodical_executer.js
 */

export default class PeriodicalExecuter{

	callback;
	frequency;
	timer;
	currentlyExecuting = false;

	constructor(callback, frequency){
		this.callback  = callback;
		this.frequency = frequency;
	}

	start(){
		this.timer = setInterval(this._onTimerEvent.bind(this), this.frequency * 1000);
		// run once when start was called
		this._onTimerEvent();
	}

	stop(){

		if(!this.timer){
			return;
		}

		clearInterval(this.timer);
		this.timer = null;
	}

	_executeCallback(){
		this.callback(this);
	}

	_onTimerEvent(){
		if(!this.currentlyExecuting){
			try{
				this.currentlyExecuting = true;
				this._executeCallback();
			}
			finally{
				this.currentlyExecuting = false;
			}
		}
	}

}
