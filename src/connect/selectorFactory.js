import verifySubselectors from './verifySubselectors'
  
export function impureFinalPropsSelectorFactory(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
  dispatch
) {
  return function impureFinalPropsSelector(state, ownProps) {
    return mergeProps(
      mapStateToProps(state, ownProps),
      mapDispatchToProps(dispatch, ownProps),
      ownProps
    )
  }
}

// 这里传递进来的
// 实际上已经是运行了第一层代码的返回函数了
// mapStateToProps,
// mapDispatchToProps,
// mergeProps,
export function pureFinalPropsSelectorFactory(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
  dispatch,
  { areStatesEqual, areOwnPropsEqual, areStatePropsEqual }
) {
  let hasRunAtLeastOnce = false
  let state
  let ownProps
  let stateProps
  let dispatchProps
  let mergedProps

  function handleFirstCall(firstState, firstOwnProps) {
    // 首次运行就比较简单 因为不需要去比对任何的数据 也没有任何的数据可以比对 
    // 所以这里只要直接拿数据就可以了
    state = firstState
    ownProps = firstOwnProps
    stateProps = mapStateToProps(state, ownProps)
    dispatchProps = mapDispatchToProps(dispatch, ownProps)
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    // 在这里将这个条件设置为真 下次就不会跳转到首次运行这边了
    hasRunAtLeastOnce = true
    return mergedProps
  }

  function handleNewPropsAndNewState() {
    // 执行返回state
    stateProps = mapStateToProps(state, ownProps)
    // 正常情况下来说的话 这边在第一次执行完以后 基本上就是false了 不会存在还等于true的情况 
    // 当然有可能异步的会有这个问题
    if (mapDispatchToProps.dependsOnOwnProps){
      dispatchProps = mapDispatchToProps(dispatch, ownProps)
    }
    // 合并所有数据
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    return mergedProps
  }

  // 合并新的props
  function handleNewProps() {
    // dependsOnOwnProps 正常情况 
    // 第一次执行的时候 肯定是true 第二次是个fasle 因为当时的函数里面还没有带上这个属性 
    // 第三次的话就是true了 这时候调用proxy的时候 这个属性就有了
    // 当你正常的返回了一个object以后 你就带上了这个属性
    // 那么当你下次在进行更新的时候就会直接获取新的数据了
    if (mapStateToProps.dependsOnOwnProps)
      stateProps = mapStateToProps(state, ownProps)

    if (mapDispatchToProps.dependsOnOwnProps)
      dispatchProps = mapDispatchToProps(dispatch, ownProps)

    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    return mergedProps
  }

  // 这里跟上面的一致
  function handleNewState() {
    const nextStateProps = mapStateToProps(state, ownProps)
    const statePropsChanged = !areStatePropsEqual(nextStateProps, stateProps)
    stateProps = nextStateProps
    
    if (statePropsChanged)
      mergedProps = mergeProps(stateProps, dispatchProps, ownProps)

    return mergedProps
  }

  function handleSubsequentCalls(nextState, nextOwnProps) {
    // 比对props跟state是否被更改
    const propsChanged = !areOwnPropsEqual(nextOwnProps, ownProps)
    const stateChanged = !areStatesEqual(nextState, state)
    state = nextState
    ownProps = nextOwnProps
    // 如果两个都被更改就一起生成新的 否则就针对自身进行生成
    if (propsChanged && stateChanged) return handleNewPropsAndNewState()
    if (propsChanged) return handleNewProps()
    if (stateChanged) return handleNewState()
    // 如果什么都没有改变的话 则直接返回原有数据
    return mergedProps
  }
  // hasRunAtLeastOnce判断是否是首次运行 如果是首次运行就跳转到handleFirstCall 
  return function pureFinalPropsSelector(nextState, nextOwnProps) {
    return hasRunAtLeastOnce
      ? handleSubsequentCalls(nextState, nextOwnProps)
      : handleFirstCall(nextState, nextOwnProps)
  }
}

// TODO: Add more comments

// If pure is true, the selector returned by selectorFactory will memoize its results,
// allowing connectAdvanced's shouldComponentUpdate to return false if final
// props have not changed. If false, the selector will always return a new
// object and shouldComponentUpdate will always return true.

export default function finalPropsSelectorFactory(dispatch, {
  initMapStateToProps,
  initMapDispatchToProps,
  initMergeProps,
  ...options
}) {
  // 这里就会初始化wrapMapToPropsFunc中第一层的代码 并且将里面的内容返回继续往下传递 具体可以看前面的说明
  const mapStateToProps = initMapStateToProps(dispatch, options)
  const mapDispatchToProps = initMapDispatchToProps(dispatch, options)
  const mergeProps = initMergeProps(dispatch, options)

  if (process.env.NODE_ENV !== 'production') {
    verifySubselectors(mapStateToProps, mapDispatchToProps, mergeProps, options.displayName)
  }
  // 这里就比较关键了 如果你设置了pure以后 这边走的其实是两个完全不同的路线
  // 先优先看一下比较简单的部分
  const selectorFactory = options.pure
    ? pureFinalPropsSelectorFactory
    : impureFinalPropsSelectorFactory

  return selectorFactory(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    dispatch,
    options
  )
}
