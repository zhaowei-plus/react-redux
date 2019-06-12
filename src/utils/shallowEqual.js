const hasOwn = Object.prototype.hasOwnProperty

function is(x, y) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y
  } else {
    return x !== x && y !== y
  }
}

export default function shallowEqual(objA, objB) {
  // 先判断两个对象是否一致 如果一致则返回true 认为不需要更新
  if (is(objA, objB)) return true
  // 只要满足null 或者 !== object 这两个条件的任意一个 都返回false 认为需要更新
  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)
  // 如果A B 是两个对象 keys以后的长度不一致 也返回false 认为下需要更新
  if (keysA.length !== keysB.length) return false
  // 如果两者长度一致 在依次比对内部数据 看是否一致
  for (let i = 0; i < keysA.length; i++) {
    // 如果objB里面不存在keysA属性的话 直接返回fasle认为需要更新了
    // 或者如果相同数组下objA与objB不相等的话 也认为需要更新
    if (!hasOwn.call(objB, keysA[i]) ||
        !is(objA[keysA[i]], objB[keysA[i]])) {
      return false
    }
  }
  // 除此情况外 都认为不需要更新
  return true
}
