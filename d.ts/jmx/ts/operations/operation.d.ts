declare namespace Jmx {
    class Operation {
        args: OperationArgument[];
        description: string;
        name: string;
        simpleName: string;
        constructor(method: string, args: OperationArgument[], description: string);
        private static buildName(method, args);
        private static buildSimpleName(name);
    }
    interface OperationArgument {
        name: string;
        type: string;
        desc: string;
    }
}
