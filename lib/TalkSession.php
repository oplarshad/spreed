<?php
declare(strict_types=1);
/**
 * @copyright Copyright (c) 2018 Joas Schilling <coding@schilljs.com>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

namespace OCA\Spreed;


use OCP\ISession;

class TalkSession {

	/** @var ISession */
	protected $session;

	public function __construct(ISession $session) {
		$this->session = $session;
	}

	/**
	 * @param string $token
	 * @return string|null
	 */
	public function getSessionForRoom(string $token) {
		return $this->getValue('spreed-session', $token);
	}

	public function setSessionForRoom(string $token, string $sessionId) {
		$this->setValue('spreed-session', $token, $sessionId);
	}

	public function removeSessionForRoom(string $token) {
		$this->removeValue('spreed-session', $token);
	}

	/**
	 * @param string $token
	 * @return string|null
	 */
	public function getPasswordForRoom(string $token) {
		return $this->getValue('spreed-password', $token);
	}

	public function setPasswordForRoom(string $token, string $password) {
		$this->setValue('spreed-password', $token, $password);
	}

	public function removePasswordForRoom(string $token) {
		$this->removeValue('spreed-password', $token);
	}

	/**
	 * @param string $key
	 * @param string $token
	 * @return string|null
	 */
	protected function getValue(string $key, string $token) {
		$values = $this->session->get($key);
		if ($values === null) {
			return null;
		}

		$values = json_decode($values, true);
		if ($values === null) {
			return null;
		}

		if (!isset($values[$token])) {
			return null;
		}
		return $values[$token];
	}

	protected function setValue(string $key, string $token, string $value) {
		$values = $this->session->get($key);
		if ($values === null) {
			$values = [];
		} else {
			$values = json_decode($values, true);
			if ($values === null) {
				$values = [];
			}
		}


		$values[$token] = $value;
		$this->session->set($key, json_encode($values));
	}

	protected function removeValue(string $key, string $token) {
		$values = $this->session->get($key);
		if ($values === null) {
			$values = [];
		} else {
			$values = json_decode($values, true);
			if ($values === null) {
				$values = [];
			} else {
				unset($values[$token]);
			}
		}

		$this->session->set($key, json_encode($values));
	}

}
