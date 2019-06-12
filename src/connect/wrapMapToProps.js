import verifyPlainObject from '../utils/verifyPlainObject'

export function wrapMapToPropsConstant(getConstant) {
  return function initConstantSelector(dispatch, options) {
    const constant = getConstant(dispatch, options)

    function constantSelector() { return constant }
    constantSelector.dependsOnOwnProps = false 
    return constantSelector
  }
}

// dependsOnOwnProps is used by createMapToPropsProxy to determine whether to pass props as args
// to the mapToProps function being wrapped. It is also used by makePurePropsSelector to determine
// whether mapToProps needs to be invoked when props have changed.
// 
// A length of one signals that mapToProps does not depend on props from the parent component.
// A length of zero is assumed to mean mapToProps is getting args via arguments or ...args and
// therefore not reporting its length accurately..
export function getDependsOnOwnProps(mapToProps) {
  return (mapToProps.dependsOnOwnProps !== null && mapToProps.dependsOnOwnProps !== undefined)
    ? Boolean(mapToProps.dependsOnOwnProps)
    : mapToProps.length !== 1
}

// Used by whenMapStateToPropsIsFunction and whenMapDispatchToPropsIsFunction,
// this function wraps mapToProps in a proxy function which does several things:
// 
//  * Detects whether the mapToProps function being called depends on props, which
//    is used by selectorFactory to decide if it should reinvoke on props changes.
//    
//  * On first call, handles mapToProps if returns another function, and treats that
//    new function as the true mapToProps for subsequent calls.
//    
//  * On first call, verifies the first result is a plain object, in order to warn
//    the developer that their mapToProps function is not returning a valid result.
//    
export function wrapMapToPropsFunc(mapToProps, methodName) {
  return function initProxySelector(dispatch, { displayName }) {
    // 当程序执行到这里的时候 其实proxy并没有被运行 只是返回了一个proxy的声明
    // 会在handleFirstCall被进行调用来初始化
    // 因为刚才程序已经走了一遍的关系 这里dependsOnOwnProps默认会变成true
    // 所以会走下面的那个proxy.mapToProps
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      return proxy.dependsOnOwnProps
        ? proxy.mapToProps(stateOrDispatch, ownProps)
        : proxy.mapToProps(stateOrDispatch)
    }

    // allow detectFactoryAndVerify to get ownProps
    proxy.dependsOnOwnProps = true

    proxy.mapToProps = function detectFactoryAndVerify(stateOrDispatch, ownProps) {
      // 当程序走到这里的时候 会将mapToProps进行复制 这边要进行运算了 只要mapToProps返回的内容不为function 并且等于object的话 程序就直接结束了
      // 否则就会继续赋值不断的遍历执行 知道返回了object以后 才将最终的结果返回到最外层
      proxy.mapToProps = mapToProps
      proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps)
      // 这里赋值以后 又会重新的走上面那个函数 但是因为现在用的是我们自己写的mapStateToProps函数了 所以不可能会有dependsOnOwnProps
      // 所以这边的dependsOnOwnProps永远会是false 因为false的关系 所以会直接调用mapStateToProps(stateOrDispatch)
      let props = proxy(stateOrDispatch, ownProps)

      if (typeof props === 'function') {
        // 只要返回的不是function并且等于object的话 这边就结束了 直接返回新的数据 否则不停的深层执行
        proxy.mapToProps = props
        proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
        props = proxy(stateOrDispatch, ownProps)
      }

      if (process.env.NODE_ENV !== 'production') 
        verifyPlainObject(props, displayName, methodName)

      return props
    }

    return proxy
  }
}
