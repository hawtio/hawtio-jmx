/**
 * @namespace RBAC
 */
namespace RBAC {

  export const pluginName: string = "hawtio-rbac";
  export const log: Logging.Logger = Logger.get(pluginName);

  export function flattenMBeanTree(mbeans: any, tree: any): void {
    if (!Core.isBlank(tree.objectName)) {
      mbeans[tree.objectName] = tree;
    }
    if (tree.children && tree.children.length > 0) {
      tree.children.forEach((child) => flattenMBeanTree(mbeans, child));
    }
  }

  export function stripClasses(css: string): string {
    if (Core.isBlank(css)) {
      return css;
    }
    let parts = css.split(" ");
    let answer = [];
    parts.forEach((part) => {
      if (part !== "can-invoke" && part !== "cant-invoke") {
        answer.push(part);
      }
    });
    return answer.join(" ").trim();
  }

  export function addClass(css: string, _class: string): string {
    if (Core.isBlank(css)) {
      return _class;
    }
    let parts = css.split(" ");
    parts.push(_class);
    return _.uniq(parts).join(" ").trim();
  }

}
