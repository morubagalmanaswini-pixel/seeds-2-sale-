import test from 'node:test';
import assert from 'node:assert/strict';
import { findNavigationTarget, detectFarmerNeed } from './voiceNavigation.js';

test('routes English commands to the correct page', () => {
  assert.deepEqual(findNavigationTarget('open orders page'), { target: 'orders', label: 'Opening your orders.' });
  assert.deepEqual(findNavigationTarget('show me demand radar'), { target: 'radar', label: 'Opening demand radar.' });
  assert.deepEqual(findNavigationTarget('go to retail connect'), { target: 'retail-connect', label: 'Opening retail connect.' });
});

test('routes Hindi and Telugu commands to the correct page', () => {
  assert.deepEqual(findNavigationTarget('मेरे ऑर्डर दिखाओ'), { target: 'orders', label: 'Opening your orders.' });
  assert.deepEqual(findNavigationTarget('రైతుల హబ్ తెరవు'), { target: 'farmer', label: 'Opening the farmer hub.' });
  assert.deepEqual(findNavigationTarget('ఇన్‌పుట్‌లు చూపించు'), { target: 'inputs', label: 'Opening farm inputs.' });
});

test('recognizes farmer support needs in multiple languages', () => {
  assert.equal(detectFarmerNeed('నేను రుణం తీసుకోవాలి'), 'I need a farming loan');
  assert.equal(detectFarmerNeed('मेरे खेत में बीमा चाहिए'), 'I need crop insurance');
  assert.equal(detectFarmerNeed('আমি ফসল বিক্রি করতে চাই'), 'I want to sell my crops');
});
