/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Node, HostComponent} from './ReactNativeTypes';
import type {ElementRef, ElementType} from 'react';

// Modules provided by RN:
import {
  UIManager,
  legacySendAccessibilityEvent,
} from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface';

import {
  findHostInstance,
  findHostInstanceWithWarning,
} from 'react-reconciler/src/ReactFiberReconciler';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import getComponentNameFromType from 'shared/getComponentNameFromType';

import {
  getInternalInstanceHandleFromPublicInstance,
  getNativeTagFromPublicInstance,
} from './ReactFabricPublicInstanceUtils';

const ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;

export function findHostInstance_DEPRECATED<TElementType: ElementType>(
  componentOrHandle: ?(ElementRef<TElementType> | number),
): ?ElementRef<HostComponent<mixed>> {
  if (__DEV__) {
    const owner = ReactCurrentOwner.current;
    if (owner !== null && owner.stateNode !== null) {
      if (!owner.stateNode._warnedAboutRefsInRender) {
        console.error(
          '%s is accessing findNodeHandle inside its render(). ' +
            'render() should be a pure function of props and state. It should ' +
            'never access something that requires stale data from the previous ' +
            'render, such as refs. Move this logic to componentDidMount and ' +
            'componentDidUpdate instead.',
          getComponentNameFromType(owner.type) || 'A component',
        );
      }

      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }

  if (componentOrHandle == null) {
    return null;
  }

  // For compatibility with Fabric instances
  if (componentOrHandle.publicInstance) {
    // $FlowExpectedError[incompatible-return] Can't refine componentOrHandle as a Fabric instance
    return componentOrHandle.publicInstance;
  }

  // For compatibility with legacy renderer instances
  if (componentOrHandle._nativeTag) {
    // $FlowFixMe[incompatible-exact] Necessary when running Flow on Fabric
    // $FlowFixMe[incompatible-return]
    return componentOrHandle;
  }

  let hostInstance;
  if (__DEV__) {
    hostInstance = findHostInstanceWithWarning(
      componentOrHandle,
      'findHostInstance_DEPRECATED',
    );
  } else {
    hostInstance = findHostInstance(componentOrHandle);
  }

  // findHostInstance handles legacy vs. Fabric differences correctly
  // $FlowFixMe[incompatible-exact] we need to fix the definition of `HostComponent` to use NativeMethods as an interface, not as a type.
  return hostInstance;
}

export function findNodeHandle(componentOrHandle: any): ?number {
  if (__DEV__) {
    const owner = ReactCurrentOwner.current;
    if (owner !== null && owner.stateNode !== null) {
      if (!owner.stateNode._warnedAboutRefsInRender) {
        console.error(
          '%s is accessing findNodeHandle inside its render(). ' +
            'render() should be a pure function of props and state. It should ' +
            'never access something that requires stale data from the previous ' +
            'render, such as refs. Move this logic to componentDidMount and ' +
            'componentDidUpdate instead.',
          getComponentNameFromType(owner.type) || 'A component',
        );
      }

      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }

  if (componentOrHandle == null) {
    return null;
  }

  if (typeof componentOrHandle === 'number') {
    // Already a node handle
    return componentOrHandle;
  }

  // For compatibility with legacy renderer instances
  if (componentOrHandle._nativeTag) {
    return componentOrHandle._nativeTag;
  }

  // For compatibility with Fabric instances
  if (componentOrHandle.nativeTag != null) {
    return componentOrHandle.nativeTag;
  }

  // For compatibility with Fabric public instances
  const nativeTag = getNativeTagFromPublicInstance(componentOrHandle);
  if (nativeTag) {
    return nativeTag;
  }

  let hostInstance;
  if (__DEV__) {
    hostInstance = findHostInstanceWithWarning(
      componentOrHandle,
      'findNodeHandle',
    );
  } else {
    hostInstance = findHostInstance(componentOrHandle);
  }

  if (hostInstance == null) {
    return hostInstance;
  }

  // $FlowFixMe[prop-missing] For compatibility with legacy renderer instances
  if (hostInstance._nativeTag != null) {
    // $FlowFixMe[incompatible-return]
    return hostInstance._nativeTag;
  }

  // $FlowFixMe[incompatible-call] Necessary when running Flow on the legacy renderer
  return getNativeTagFromPublicInstance(hostInstance);
}

export function dispatchCommand(
  handle: any,
  command: string,
  args: Array<any>,
) {
  const nativeTag =
    handle._nativeTag != null
      ? handle._nativeTag
      : getNativeTagFromPublicInstance(handle);
  if (nativeTag == null) {
    if (__DEV__) {
      console.error(
        "dispatchCommand was called with a ref that isn't a " +
          'native component. Use React.forwardRef to get access to the underlying native component',
      );
    }
    return;
  }

  const internalInstanceHandle =
    getInternalInstanceHandleFromPublicInstance(handle);

  if (internalInstanceHandle != null) {
    const node = getNodeFromInternalInstanceHandle(internalInstanceHandle);
    if (node != null) {
      nativeFabricUIManager.dispatchCommand(node, command, args);
    }
  } else {
    UIManager.dispatchViewManagerCommand(nativeTag, command, args);
  }
}

export function sendAccessibilityEvent(handle: any, eventType: string) {
  const nativeTag =
    handle._nativeTag != null
      ? handle._nativeTag
      : getNativeTagFromPublicInstance(handle);
  if (nativeTag == null) {
    if (__DEV__) {
      console.error(
        "sendAccessibilityEvent was called with a ref that isn't a " +
          'native component. Use React.forwardRef to get access to the underlying native component',
      );
    }
    return;
  }

  const internalInstanceHandle =
    getInternalInstanceHandleFromPublicInstance(handle);
  if (internalInstanceHandle != null) {
    const node = getNodeFromInternalInstanceHandle(internalInstanceHandle);
    if (node != null) {
      nativeFabricUIManager.sendAccessibilityEvent(node, eventType);
    }
  } else {
    legacySendAccessibilityEvent(nativeTag, eventType);
  }
}

export function getNodeFromInternalInstanceHandle(
  internalInstanceHandle: mixed,
): ?Node {
  return (
    // $FlowExpectedError[incompatible-return] internalInstanceHandle is opaque but we need to make an exception here.
    internalInstanceHandle &&
    // $FlowExpectedError[incompatible-return]
    internalInstanceHandle.stateNode &&
    // $FlowExpectedError[incompatible-use]
    internalInstanceHandle.stateNode.node
  );
}
