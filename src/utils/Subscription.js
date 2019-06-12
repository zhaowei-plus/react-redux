// encapsulates the subscription logic for connecting a component to the redux store, as
// well as nesting subscriptions of descendant components, so that we can ensure the
// ancestor components re-render before descendants

const CLEARED = null
const nullListeners = { notify() {} }

function createListenerCollection() {
  // the current/next pattern is copied from redux's createStore code.
  // TODO: refactor+expose that code to be reusable here?
  let current = []
  let next = []

  return {
    // 清楚当前队列
    clear() {
      next = CLEARED
      current = CLEARED
    },

    //这里要注意 如果当前下面没有子的话 其实这里的代码是无意义的 
    // 只有自身成为了父 并且有子视图挂在下面这里才会执行队列 
    notify() {
      const listeners = current = next
      for (let i = 0; i < listeners.length; i++) {
        listeners[i]()
      }
    },

    // 获取当前的最新监听数据
    get() {
      return next
    },

    subscribe(listener) {
      let isSubscribed = true
      // 如果不相等就将当前的监听添加到数组中
      if (next === current) next = current.slice()
      next.push(listener)
      // 这里模仿了redux返回了一个卸载监听的函数
      return function unsubscribe() {
        if (!isSubscribed || current === CLEARED) return
        isSubscribed = false

        if (next === current) next = current.slice()
        next.splice(next.indexOf(listener), 1)
      }
    }
  }
}

export default class Subscription {
  constructor(store, parentSub, onStateChange) {
    this.store = store
    this.parentSub = parentSub
    this.onStateChange = onStateChange
    this.unsubscribe = null
    this.listeners = nullListeners
  }

  addNestedSub(listener) {
    this.trySubscribe()
    // 这里不使用redux的更新 而是改成由自己来维护子级
    return this.listeners.subscribe(listener)
  }

  notifyNestedSubs() {
    this.listeners.notify()
  }

  isSubscribed() {
    return Boolean(this.unsubscribe)
  }

  trySubscribe() {
    // 当你执行了这个函数以后 
    if (!this.unsubscribe) {
      this.unsubscribe = this.parentSub
        // 
        ? this.parentSub.addNestedSub(this.onStateChange)
        // 这里使用的是redux中提供的函数 在这里当你每次dispatch的时候 就会被触发到
        : this.store.subscribe(this.onStateChange)
      // 当你走到这里的时候 listeners就被替换了 这个时候 才是真正可以使用监听了
      // 如果你不是从parent获取更新的话 默认这里使用redux来维护你的监听
      // 但是如果你有parent以后 是由内部来进行维护的
      // 内部调用的时候 其实会继续走addNestedSub
      // this.listeners.subscribe(listener)
      // 并且在这里返回一个监听
      // 这个定义的变量也只会在有父级的时候 被使用到 因为自身也有可能成为别人的父 
      // 所以这边没有做其他的判断 采取全部都定义的方式
      this.listeners = createListenerCollection()
    }
  }

  tryUnsubscribe() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
      this.listeners.clear()
      this.listeners = nullListeners
    }
  }
}
