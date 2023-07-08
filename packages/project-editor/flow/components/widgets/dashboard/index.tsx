import React from "react";
import { observable, makeObservable, computed } from "mobx";
import classNames from "classnames";

import QRC from "../qrcodegen";

import { to16bitsColor } from "eez-studio-shared/color";

import {
    registerClass,
    PropertyType,
    makeDerivedClassInfo,
    getId,
    IEezObject,
    IMessage,
    PropertyProps,
    MessageType
} from "project-editor/core/object";
import {
    Message,
    ProjectStore,
    getProjectStore,
    propertyNotFoundMessage,
    propertyNotSetMessage,
    propertySetButNotUsedMessage
} from "project-editor/store";

import {
    Project,
    ProjectType,
    checkObjectReference,
    findBitmap,
    getProject
} from "project-editor/project/project";

import type {
    IDataContext,
    IFlowContext
} from "project-editor/flow/flow-interfaces";

import { FLOW_ITERATOR_INDEX_VARIABLE } from "project-editor/features/variable/defs";
import {
    CHECKBOX_CHANGE_EVENT_STRUCT_NAME,
    CLICK_EVENT_STRUCT_NAME,
    DROP_DOWN_LIST_CHANGE_EVENT_STRUCT_NAME,
    TEXT_INPUT_CHANGE_EVENT_STRUCT_NAME,
    makeActionParamsValue,
    makeCheckboxActionParamsValue as makeCheckboxChangeEventValue,
    makeDropDownListActionParamsValue,
    makeTextInputActionParamsValue as makeTextInputChangeEventValue
} from "project-editor/features/variable/value-type";

import {
    Widget,
    makeDataPropertyInfo,
    ComponentOutput,
    makeExpressionProperty,
    makeTextPropertyInfo,
    makeStylePropertyInfo,
    migrateStyleProperty
} from "project-editor/flow/component";

import type { FlowState } from "project-editor/flow/runtime/runtime";

import {
    generalGroup,
    specificGroup
} from "project-editor/ui-components/PropertyGrid/groups";
import {
    evalProperty,
    getBooleanValue,
    getTextValue
} from "project-editor/flow/helper";
import type { IDashboardComponentContext } from "eez-studio-types";
import { Loader } from "eez-studio-ui/loader";

import { Style } from "project-editor/features/style/style";
import { ProjectEditor } from "project-editor/project-editor-interface";
import { getComponentName } from "../../components-registry";
import { observer } from "mobx-react";
import { Button } from "eez-studio-ui/button";
import { detectFileType } from "instrument/connection/file-type";
import { Bitmap } from "project-editor/features/bitmap/bitmap";

////////////////////////////////////////////////////////////////////////////////

export class TextDashboardWidget extends Widget {
    name: string;
    text?: string;

    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        label: (widget: TextDashboardWidget) => {
            let name = getComponentName(widget.type);

            const project = ProjectEditor.getProject(widget);

            if (!project.projectTypeTraits.hasFlowSupport) {
                if (widget.text) {
                    return `${name}: ${widget.text}`;
                }
            }

            if (widget.name) {
                return `${name}: ${widget.name}`;
            }

            if (widget.data) {
                return `${name}: ${widget.data}`;
            }

            return name;
        },

        properties: [
            {
                name: "name",
                type: PropertyType.String,
                propertyGridGroup: generalGroup
            },
            makeDataPropertyInfo("data", {
                displayName: (widget: TextDashboardWidget) => {
                    const project = ProjectEditor.getProject(widget);
                    if (project.projectTypeTraits.hasFlowSupport) {
                        return "Text";
                    }
                    return "Data";
                }
            }),
            makeTextPropertyInfo("text")
        ],

        beforeLoadHook: (widget: Widget, jsObject: any, project: Project) => {
            jsObject.type = "TextDashboardWidget";

            if (jsObject.text) {
                if (project.projectTypeTraits.hasFlowSupport) {
                    if (!jsObject.data) {
                        jsObject.data = `"${jsObject.text}"`;
                    }
                    delete jsObject.text;
                }
            }
        },

        defaultValue: {
            left: 0,
            top: 0,
            width: 64,
            height: 32
        },

        icon: (
            <svg
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
            >
                <path d="M0 0h24v24H0z" stroke="none" />
                <circle cx="17.5" cy="15.5" r="3.5" />
                <path d="M3 19V8.5a3.5 3.5 0 0 1 7 0V19m-7-6h7m11-1v7" />
            </svg>
        ),

        check: (widget: TextDashboardWidget, messages: IMessage[]) => {
            const project = ProjectEditor.getProject(widget);

            if (!project.projectTypeTraits.hasFlowSupport) {
                if (!widget.text && !widget.data) {
                    messages.push(propertyNotSetMessage(widget, "text"));
                }
            } else {
                if (!widget.data) {
                    messages.push(propertyNotSetMessage(widget, "data"));
                }
            }
        },

        execute: (context: IDashboardComponentContext) => {}
    });

    constructor() {
        super();

        makeObservable(this, {
            name: observable,
            text: observable
        });
    }

    getClassName() {
        return classNames("eez-widget-component", this.type);
    }

    styleHook(style: React.CSSProperties, flowContext: IFlowContext) {
        super.styleHook(style, flowContext);

        if (this.style.alignHorizontalProperty == "left") {
            style.textAlign = "left";
        } else if (this.style.alignHorizontalProperty == "center") {
            style.textAlign = "center";
        } else if (this.style.alignHorizontalProperty == "right") {
            style.textAlign = "right";
        }
    }

    render(flowContext: IFlowContext, width: number, height: number) {
        const result = getTextValue(
            flowContext,
            this,
            "data",
            this.name,
            this.text
        );
        let text: string;
        let node: React.ReactNode | null;
        if (typeof result == "object") {
            text = result.text;
            node = result.node;
        } else {
            text = result;
            node = null;
        }

        const style: React.CSSProperties = {};
        this.styleHook(style, flowContext);

        return (
            <>
                <span
                    className={classNames(this.style.classNames)}
                    onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (flowContext.projectStore.runtime) {
                            flowContext.projectStore.runtime.executeWidgetAction(
                                flowContext,
                                this,
                                "CLICKED",
                                makeActionParamsValue(flowContext),
                                `struct:${CLICK_EVENT_STRUCT_NAME}`
                            );
                        }
                    }}
                    style={{ opacity: style.opacity }}
                >
                    {node || text}
                </span>

                {super.render(flowContext, width, height)}
            </>
        );
    }
}

registerClass("TextDashboardWidget", TextDashboardWidget);

////////////////////////////////////////////////////////////////////////////////

export class RectangleDashboardWidget extends Widget {
    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        properties: [],

        beforeLoadHook: (widget: Widget, jsObject: any, project: Project) => {
            jsObject.type = "RectangleDashboardWidget";
        },

        defaultValue: {
            left: 0,
            top: 0,
            width: 64,
            height: 32
        },

        icon: (
            <svg
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
            </svg>
        ),

        check: (object: RectangleDashboardWidget, messages: IMessage[]) => {
            if (object.data) {
                messages.push(propertySetButNotUsedMessage(object, "data"));
            }
        },

        execute: (context: IDashboardComponentContext) => {}
    });

    constructor() {
        super();

        makeObservable(this, {});
    }

    render(flowContext: IFlowContext, width: number, height: number) {
        return <>{super.render(flowContext, width, height)}</>;
    }
}

registerClass("RectangleDashboardWidget", RectangleDashboardWidget);

////////////////////////////////////////////////////////////////////////////////

function TextInputWidgetInput({
    value,
    flowContext,
    textInputWidget,
    placeholder,
    password
}: {
    value: string;
    flowContext: IFlowContext;
    textInputWidget: TextInputWidget;
    placeholder: string;
    password: boolean;
}) {
    const ref = React.useRef<HTMLInputElement>(null);
    const [cursor, setCursor] = React.useState<number | null>(null);

    React.useEffect(() => {
        const input = ref.current;
        if (input) input.setSelectionRange(cursor, cursor);
    }, [ref, cursor, value]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            const flowState = flowContext.flowState as FlowState;
            if (flowState && flowState.runtime) {
                flowState.runtime.executeWidgetAction(
                    flowContext,
                    textInputWidget,
                    "ON_CHANGE",
                    makeTextInputChangeEventValue(flowContext, value),
                    `struct:${TEXT_INPUT_CHANGE_EVENT_STRUCT_NAME}`
                );
            }
        }
    };

    return (
        <>
            <input
                ref={ref}
                type={password ? "password" : "text"}
                value={value}
                placeholder={placeholder}
                onChange={event => {
                    const flowState = flowContext.flowState as FlowState;
                    if (flowState) {
                        setCursor(event.target.selectionStart);

                        const value = event.target.value;

                        if (textInputWidget.data) {
                            flowState.runtime.assignProperty(
                                flowContext,
                                textInputWidget,
                                "data",
                                value
                            );
                        }

                        if (flowState.runtime) {
                            flowState.runtime.executeWidgetAction(
                                flowContext,
                                textInputWidget,
                                "ON_INPUT",
                                makeTextInputChangeEventValue(
                                    flowContext,
                                    value
                                ),
                                `struct:${TEXT_INPUT_CHANGE_EVENT_STRUCT_NAME}`
                            );
                        }
                    }
                }}
                onKeyDown={handleKeyDown}
            ></input>
        </>
    );
}

export class TextInputWidget extends Widget {
    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        componentPaletteGroupName: "!1Input",

        properties: [
            makeDataPropertyInfo("data", {
                displayName: "Value"
            }),
            makeDataPropertyInfo("placehoder"),
            {
                name: "password",
                type: PropertyType.Boolean,
                propertyGridGroup: specificGroup
            }
        ],
        defaultValue: {
            left: 0,
            top: 0,
            width: 160,
            height: 32,
            title: ""
        },

        componentDefaultValue: (projectStore: ProjectStore) => {
            return projectStore.projectTypeTraits.isFirmwareModule ||
                projectStore.projectTypeTraits.isApplet ||
                projectStore.projectTypeTraits.isResource
                ? {
                      style: {
                          useStyle: "default"
                      }
                  }
                : projectStore.projectTypeTraits.isFirmware
                ? {
                      style: {
                          useStyle: "text_input"
                      }
                  }
                : {};
        },

        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M12 3a3 3 0 0 0 -3 3v12a3 3 0 0 0 3 3"></path>
                <path d="M6 3a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3"></path>
                <path d="M13 7h7a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-7"></path>
                <path d="M5 7h-1a1 1 0 0 0 -1 1v8a1 1 0 0 0 1 1h1"></path>
                <path d="M17 12h.01"></path>
                <path d="M13 12h.01"></path>
            </svg>
        ),
        execute: (context: IDashboardComponentContext) => {},

        widgetEvents: {
            ON_INPUT: {
                code: 1,
                paramExpressionType: `struct:${TEXT_INPUT_CHANGE_EVENT_STRUCT_NAME}`,
                oldName: "action"
            },
            ON_CHANGE: {
                code: 2,
                paramExpressionType: `struct:${TEXT_INPUT_CHANGE_EVENT_STRUCT_NAME}`,
                oldName: "onChange"
            }
        }
    });

    placehoder: string;
    password: boolean;

    constructor() {
        super();

        makeObservable(this, {
            placehoder: observable,
            password: observable
        });
    }

    getValue(flowContext: IFlowContext) {
        if (flowContext.projectStore.projectTypeTraits.hasFlowSupport) {
            if (this.data) {
                try {
                    return evalProperty(flowContext, this, "data");
                } catch (err) {
                    //console.error(err);
                }
            }

            return "";
        }

        if (this.data) {
            return flowContext.dataContext.get(this.data) ?? "";
        }

        return "";
    }

    getPlaceholder(flowContext: IFlowContext) {
        if (flowContext.projectStore.projectTypeTraits.hasFlowSupport) {
            if (this.placehoder) {
                try {
                    return evalProperty(flowContext, this, "placehoder");
                } catch (err) {
                    //console.error(err);
                }
            }

            return "";
        }

        return "";
    }

    getPassword(flowContext: IFlowContext) {
        if (flowContext.projectStore.projectTypeTraits.hasFlowSupport) {
            if (this.password) {
                try {
                    return evalProperty(flowContext, this, "password");
                } catch (err) {
                    //console.error(err);
                }
            }

            return "";
        }

        return "";
    }

    render(
        flowContext: IFlowContext,
        width: number,
        height: number
    ): React.ReactNode {
        let value = this.getValue(flowContext) ?? "";
        let placeholder = this.getPlaceholder(flowContext) ?? "";

        return (
            <>
                <TextInputWidgetInput
                    flowContext={flowContext}
                    textInputWidget={this}
                    value={value}
                    placeholder={placeholder}
                    password={this.password}
                />
                {super.render(flowContext, width, height)}
            </>
        );
    }
}

registerClass("TextInputWidget", TextInputWidget);

////////////////////////////////////////////////////////////////////////////////

export class CheckboxWidget extends Widget {
    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        componentPaletteGroupName: "!1Input",

        properties: [
            makeDataPropertyInfo("data", {
                displayName: "Value"
            }),
            makeExpressionProperty(
                {
                    name: "label",
                    type: PropertyType.MultilineText,
                    propertyGridGroup: specificGroup
                },
                "string"
            )
        ],
        defaultValue: {
            left: 0,
            top: 0,
            width: 120,
            height: 20
        },

        icon: (
            <svg
                viewBox="0 0 1280 1279"
                stroke="currentColor"
                fill="currentColor"
            >
                <path d="M1052 225.7c-13 8-54 35.2-66.2 43.9l-11.8 8.5-11.8-7.8c-28.8-19.1-64.8-34-98.6-40.8-31.8-6.4-10.6-6-307.1-6-280.2 0-275.2-.1-300 4.1-45.9 7.7-92.8 28.7-129.5 58-10.9 8.7-29.7 27.5-38.4 38.4-28.3 35.6-44.7 72.7-52.4 119.4-1.5 9.2-1.7 34.4-2 291.6-.2 183.6.1 286 .7 294.5 2.5 32.4 10.1 60 24.2 88.5 14.2 28.7 31 51.2 54.9 73.5 34.1 32 79.1 55.4 127 66.3 31.7 7.2 6.3 6.7 314.5 6.7h277l14-2.2c92.9-14.9 166.7-67 205-144.8 11-22.4 17.7-43.4 22.2-70.2 1.7-10.3 1.8-24.8 1.8-302.3 0-309.6.2-295.9-4.6-318.5-7.7-36.4-25-72.3-49.7-103.2-7.9-10-9-11.6-7.4-11.1.8.3 35.3-35.7 44.9-46.9 9.4-10.9 11.5-16.3 6.3-16.3-4.1 0-33.1 16.4-40.5 22.9-9.6 8.5-5.3 3.7 17.1-18.7l25.1-25.1-2.9-3.6c-1.6-1.9-3.3-3.5-3.6-3.4-.4 0-4.1 2.1-8.2 4.6zM836.5 334.8c6.1 1.2 14.9 3.3 19.6 4.6 9.6 2.9 25.9 9.4 25.9 10.5 0 .4-8.2 7.8-18.2 16.6-131.9 115.4-266.2 268.4-386.9 441-9.7 13.7-20.7 29.6-24.5 35.3-3.8 5.6-7.4 10-8 9.8-.9-.3-137.4-81.8-218.1-130.2l-7.2-4.3-3 3.8-3.1 3.8 11.2 13.9c49.6 61.6 263.1 323.4 263.7 323.4.4 0 1.3-1 2-2.2.6-1.3.9-1.5.7-.6-.5 1.9 5 7.3 9.1 8.9 3.9 1.5 8.5-1.1 12-6.7 1.6-2.7 7.4-14.4 12.8-25.9 27.4-58.3 76.5-153.1 111-214 84.9-150.1 186.4-294.2 291.8-414.3 6.4-7.4 10.5-12.8 10.1-13.5-.4-.7.3-.3 1.5.8 5.9 5.2 17.2 25.8 22.1 40.3 6.5 19.5 6.1-1.4 5.8 312.7l-.3 285-2.7 10c-1.6 5.5-3.8 12.5-5 15.5-14.9 37.8-46.5 68.6-86.6 84.5-19.1 7.5-34.9 11-56.7 12.5-19 1.3-502.3 1.3-521.3 0-24.3-1.7-44.3-6.7-64.9-16.5-44.7-21.2-74.4-57.1-84-101.8-1.7-7.7-1.8-24.4-1.8-293.2 0-270.2.1-285.4 1.8-293.5 3.8-18 10-32.8 20.3-48.2 25.4-38.2 70.8-64.4 120.9-69.7 4.4-.5 127.5-.8 273.5-.7l265.5.2 11 2.2z" />
            </svg>
        ),

        execute: (context: IDashboardComponentContext) => {},

        widgetEvents: {
            ON_CHANGE: {
                code: 1,
                paramExpressionType: `struct:${CHECKBOX_CHANGE_EVENT_STRUCT_NAME}`,
                oldName: "action"
            }
        }
    });

    label: string;

    constructor() {
        super();

        makeObservable(this, {
            label: observable
        });
    }

    getOutputs(): ComponentOutput[] {
        return [...super.getOutputs()];
    }

    getChecked(flowContext: IFlowContext) {
        if (flowContext.projectStore.projectTypeTraits.hasFlowSupport) {
            if (this.data) {
                try {
                    return !!evalProperty(flowContext, this, "data");
                } catch (err) {
                    //console.error(err);
                }
            }

            return false;
        }

        if (this.data) {
            return !!flowContext.dataContext.get(this.data);
        }

        return false;
    }

    getClassName() {
        return classNames("eez-widget-component", this.type);
    }

    render(
        flowContext: IFlowContext,
        width: number,
        height: number
    ): React.ReactNode {
        let checked = this.getChecked(flowContext);

        let index;
        if (flowContext.dataContext.has(FLOW_ITERATOR_INDEX_VARIABLE)) {
            index = flowContext.dataContext.get(FLOW_ITERATOR_INDEX_VARIABLE);
        } else {
            index = 0;
        }

        let id = "CheckboxWidgetInput-" + getId(this);
        if (index > 0) {
            id = id + "-" + index;
        }

        const style: React.CSSProperties = {};
        this.styleHook(style, flowContext);

        const label = getTextValue(
            flowContext,
            this,
            "label",
            undefined,
            this.label
        );

        return (
            <>
                <div
                    className={classNames("form-check", this.style.classNames)}
                    style={{ opacity: style.opacity }}
                >
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={event => {
                            const flowState =
                                flowContext.flowState as FlowState;
                            if (flowState) {
                                const value = event.target.checked;

                                if (this.data) {
                                    flowState.runtime.assignProperty(
                                        flowContext,
                                        this,
                                        "data",
                                        value
                                    );
                                }

                                if (flowState.runtime) {
                                    flowState.runtime.executeWidgetAction(
                                        flowContext,
                                        this,
                                        "ON_CHANGE",
                                        makeCheckboxChangeEventValue(
                                            flowContext,
                                            value
                                        ),
                                        `struct:${CHECKBOX_CHANGE_EVENT_STRUCT_NAME}`
                                    );
                                }
                            }
                        }}
                        id={id}
                    ></input>
                    <label className="form-check-label" htmlFor={id}>
                        {typeof label == "string" ? label : label.text}
                    </label>
                </div>
                {super.render(flowContext, width, height)}
            </>
        );
    }
}

registerClass("CheckboxWidget", CheckboxWidget);

////////////////////////////////////////////////////////////////////////////////

export class DropDownListDashboardWidget extends Widget {
    options: string;

    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        componentPaletteGroupName: "!1Input",
        componentPaletteLabel: "DropDown",

        properties: [makeDataPropertyInfo("options")],

        beforeLoadHook: (
            widget: DropDownListDashboardWidget,
            jsWidget: Partial<DropDownListDashboardWidget>
        ) => {
            jsWidget.type = "DropDownListDashboardWidget";
        },

        defaultValue: {
            left: 0,
            top: 0,
            width: 120,
            height: 32
        },

        icon: (
            <svg viewBox="0 0 1000 1000" fill="currentColor">
                <path d="M258.8 402.9v157.4H990V402.9H258.8zm685.5 111.7H304.5v-66h639.8v66zM258.8 743.1H990V585.7H258.8v157.4zm45.7-111.7h639.8v66H304.5v-66zm-45.7 293.2H990V767.2H258.8v157.4zm45.7-111.7h639.8v66H304.5v-66zm436.7-463.3h198V75.4H10v274.2h731.2zm0-228.5h152.3v182.8H741.2V121.1zM55.7 303.9V121.1h639.8v182.8H55.7zm714.7-113.5h100.1l-50 63.6-50.1-63.6z" />
            </svg>
        ),

        widgetEvents: {
            ON_CHANGE: {
                code: 1,
                paramExpressionType: `struct:${DROP_DOWN_LIST_CHANGE_EVENT_STRUCT_NAME}`,
                oldName: "action"
            }
        },

        execute: (context: IDashboardComponentContext) => {}
    });

    constructor() {
        super();

        makeObservable(this, {
            options: observable
        });
    }

    render(flowContext: IFlowContext, width: number, height: number) {
        let options: string[] = evalProperty(flowContext, this, "options");
        if (options == undefined && !Array.isArray(options)) {
            options = [];
        }

        let selectedIndex: number = evalProperty(flowContext, this, "data");

        return (
            <>
                <select
                    value={options[selectedIndex] || ""}
                    onChange={event => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (flowContext.projectStore.runtime) {
                            flowContext.projectStore.runtime.assignProperty(
                                flowContext,
                                this,
                                "data",
                                event.target.selectedIndex
                            );

                            flowContext.projectStore.runtime.executeWidgetAction(
                                flowContext,
                                this,
                                "ON_CHANGE",
                                makeDropDownListActionParamsValue(
                                    flowContext,
                                    event.target.selectedIndex
                                ),
                                `struct:${DROP_DOWN_LIST_CHANGE_EVENT_STRUCT_NAME}`
                            );
                        }
                    }}
                >
                    {options
                        .filter(option => typeof option === "string")
                        .map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                </select>
                {super.render(flowContext, width, height)}
            </>
        );
    }
}

registerClass("DropDownListDashboardWidget", DropDownListDashboardWidget);

////////////////////////////////////////////////////////////////////////////////

export class ProgressDashboardWidget extends Widget {
    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        componentPaletteGroupName: "!1Visualiser",

        properties: [
            makeDataPropertyInfo("min"),
            makeDataPropertyInfo("max"),
            {
                name: "orientation",
                type: PropertyType.Enum,
                propertyGridGroup: specificGroup,
                enumItems: [
                    {
                        id: "horizontal"
                    },
                    {
                        id: "vertical"
                    }
                ]
            }
        ],

        beforeLoadHook: (
            progressWidget: ProgressDashboardWidget,
            jsProgressWidget: Partial<ProgressDashboardWidget>,
            project: Project
        ) => {
            jsProgressWidget.type = "ProgressDashboardWidget";

            if (project.projectTypeTraits.hasFlowSupport) {
                if (jsProgressWidget.min == undefined) {
                    jsProgressWidget.min = "0";
                }
                if (jsProgressWidget.max == undefined) {
                    jsProgressWidget.max = "100";
                }
            }

            if (jsProgressWidget.orientation == undefined) {
                jsProgressWidget.orientation =
                    jsProgressWidget.width! > jsProgressWidget.height!
                        ? "horizontal"
                        : "vertical";
            }
        },

        defaultValue: {
            left: 0,
            top: 0,
            width: 128,
            height: 20
        },

        icon: (
            <svg viewBox="0 0 32 32" fill="currentColor">
                <path d="M28 21H4a2.0021 2.0021 0 0 1-2-2v-6a2.0021 2.0021 0 0 1 2-2h24a2.0021 2.0021 0 0 1 2 2v6a2.0021 2.0021 0 0 1-2 2ZM4 13v6h24v-6Z" />
                <path d="M6 15h14v2H6z" />
                <path fill="none" d="M0 0h32v32H0z" />
            </svg>
        ),

        execute: (context: IDashboardComponentContext) => {}
    });

    min: string;
    max: string;
    orientation: string;

    constructor() {
        super();

        makeObservable(this, {
            min: observable,
            max: observable,
            orientation: observable
        });
    }

    getPercent(flowContext: IFlowContext) {
        if (flowContext.projectStore.projectTypeTraits.hasFlowSupport) {
            if (flowContext.flowState) {
                try {
                    const min = evalProperty(flowContext, this, "min");
                    const max = evalProperty(flowContext, this, "max");
                    let value = evalProperty(flowContext, this, "data");

                    value = ((value - min) * 100) / (max - min);

                    if (value != null && value != undefined) {
                        return value;
                    }
                } catch (err) {
                    //console.error(err);
                }

                return 0;
            }

            return 25;
        }

        if (this.data) {
            const result = flowContext.dataContext.get(this.data);
            if (result != undefined) {
                return result;
            }
        }

        return 25;
    }

    render(flowContext: IFlowContext, width: number, height: number) {
        const percent = this.getPercent(flowContext);
        let isHorizontal = this.orientation == "horizontal";

        return (
            <>
                <div
                    className="progress"
                    style={{
                        display: "block",
                        position: "relative",
                        backgroundColor: this.style.color
                    }}
                >
                    <div
                        className="progress-bar"
                        role="progressbar"
                        style={
                            isHorizontal
                                ? flowContext.projectStore.runtime &&
                                  flowContext.projectStore.runtime.isRTL
                                    ? {
                                          display: "block",
                                          position: "absolute",
                                          transition: "none",
                                          left: 100 - percent + "%",
                                          top: 0,
                                          width: percent + "%",
                                          height,
                                          backgroundColor:
                                              this.style.activeColor
                                      }
                                    : {
                                          display: "block",
                                          position: "absolute",
                                          transition: "none",
                                          left: 0,
                                          top: 0,
                                          width: percent + "%",
                                          height,
                                          backgroundColor:
                                              this.style.activeColor
                                      }
                                : {
                                      display: "block",
                                      position: "absolute",
                                      transition: "none",
                                      left: 0,
                                      top: 100 - percent + "%",
                                      width,
                                      height: percent + "%",
                                      backgroundColor: this.style.activeColor
                                  }
                        }
                    ></div>
                </div>
                {super.render(flowContext, width, height)}
            </>
        );
    }
}

registerClass("ProgressDashboardWidget", ProgressDashboardWidget);

////////////////////////////////////////////////////////////////////////////////

export class SpinnerWidget extends Widget {
    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        componentPaletteGroupName: "!1Visualiser",

        properties: [],

        defaultValue: {
            left: 0,
            top: 0,
            width: 40,
            height: 40
        },

        icon: (
            <svg
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
            >
                <path d="M0 0h24v24H0z" stroke="none" />
                <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
        ),

        execute: (context: IDashboardComponentContext) => {}
    });

    constructor() {
        super();

        makeObservable(this, {});
    }

    render(
        flowContext: IFlowContext,
        width: number,
        height: number
    ): React.ReactNode {
        return <Loader />;
    }
}

registerClass("SpinnerWidget", SpinnerWidget);

////////////////////////////////////////////////////////////////////////////////

export class QRCodeDashboardWidget extends Widget {
    errorCorrection: any;

    constructor() {
        super();

        makeObservable(this, {
            errorCorrection: observable,
            errorCorrectionValue: computed
        });
    }

    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        componentPaletteGroupName: "!1Visualiser",

        properties: [
            makeDataPropertyInfo("data", {
                displayName: "Text"
            }),
            {
                name: "errorCorrection",
                type: PropertyType.Enum,
                enumItems: [
                    {
                        id: "low"
                    },
                    {
                        id: "medium"
                    },
                    {
                        id: "quartile"
                    },
                    {
                        id: "high"
                    }
                ],
                propertyGridGroup: specificGroup
            }
        ],

        beforeLoadHook: (
            widget: QRCodeDashboardWidget,
            jsWidget: Partial<QRCodeDashboardWidget>
        ) => {
            jsWidget.type = "QRCodeDashboardWidget";
        },

        defaultValue: {
            left: 0,
            top: 0,
            width: 128,
            height: 128,
            errorCorrection: "medium"
        },

        icon: (
            <svg viewBox="0 0 16 16">
                <path fill="currentColor" d="M6 0H0v6h6V0zM5 5H1V1h4v4z" />
                <path
                    fill="currentColor"
                    d="M2 2h2v2H2V2zM0 16h6v-6H0v6zm1-5h4v4H1v-4z"
                />
                <path
                    fill="currentColor"
                    d="M2 12h2v2H2v-2zm8-12v6h6V0h-6zm5 5h-4V1h4v4z"
                />
                <path
                    fill="currentColor"
                    d="M12 2h2v2h-2V2zM2 7H0v2h3V8H2zm5 2h2v2H7V9zM3 7h2v1H3V7zm6 5H7v1h1v1h1v-1zM6 7v1H5v1h2V7zm2-3h1v2H8V4zm1 4v1h2V7H8v1zM7 6h1v1H7V6zm2 8h2v2H9v-2zm-2 0h1v2H7v-2zm2-3h1v1H9v-1zm0-8V1H8V0H7v4h1V3zm3 11h1v2h-1v-2zm0-2h2v1h-2v-1zm-1 1h1v1h-1v-1zm-1-1h1v1h-1v-1zm4-2v1h1v1h1v-2h-1zm1 3h-1v3h2v-2h-1zm-5-3v1h3V9h-2v1zm2-3v1h2v1h2V7h-2z"
                />
            </svg>
        ),

        execute: (context: IDashboardComponentContext) => {}
    });

    getText(flowContext: IFlowContext) {
        if (!this.data) {
            return undefined;
        }

        if (flowContext.projectStore.projectTypeTraits.hasFlowSupport) {
            return evalProperty(flowContext, this, "data");
        }

        return this.data;
    }

    get errorCorrectionValue() {
        if (this.errorCorrection == "low") return QRC.Ecc.LOW;
        if (this.errorCorrection == "medium") return QRC.Ecc.MEDIUM;
        if (this.errorCorrection == "quartile") return QRC.Ecc.QUARTILE;
        return QRC.Ecc.HIGH;
    }

    styleHook(style: React.CSSProperties, flowContext: IFlowContext) {
        super.styleHook(style, flowContext);

        style.backgroundColor = to16bitsColor(
            this.style.backgroundColorProperty
        );
    }

    static toSvgString(
        qr: any,
        border: number,
        lightColor: string,
        darkColor: string
    ) {
        let parts: Array<string> = [];
        for (let y = 0; y < qr.size; y++) {
            for (let x = 0; x < qr.size; x++) {
                if (qr.getModule(x, y))
                    parts.push(`M${x + border},${y + border}h1v1h-1z`);
            }
        }
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox={`0 0 ${qr.size + border * 2} ${qr.size + border * 2}`}
                stroke="none"
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
            >
                <rect width="100%" height="100%" fill={`${lightColor}`} />
                <path d={`${parts.join(" ")}`} fill={`${darkColor}`} />
            </svg>
        );
    }

    render(flowContext: IFlowContext, width: number, height: number) {
        const text = this.getText(flowContext) || "";

        const qr0 = QRC.encodeText(text, this.errorCorrectionValue);
        const svg = QRCodeDashboardWidget.toSvgString(
            qr0,
            1,
            to16bitsColor(this.style.backgroundColorProperty),
            to16bitsColor(this.style.colorProperty)
        );

        return (
            <>
                {svg}
                {super.render(flowContext, width, height)}
            </>
        );
    }
}

registerClass("QRCodeDashboardWidget", QRCodeDashboardWidget);

////////////////////////////////////////////////////////////////////////////////

export class ButtonDashboardWidget extends Widget {
    text?: string;
    enabled?: string;
    disabledStyle: Style;

    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        properties: [
            makeDataPropertyInfo("data", {
                displayName: (widget: ButtonDashboardWidget) => {
                    const project = ProjectEditor.getProject(widget);
                    if (project.projectTypeTraits.hasFlowSupport) {
                        return "Text";
                    }
                    return "Data";
                }
            }),
            makeTextPropertyInfo("text"),
            makeDataPropertyInfo("enabled"),
            makeStylePropertyInfo("disabledStyle")
        ],

        beforeLoadHook: (
            widget: IEezObject,
            jsObject: any,
            project: Project
        ) => {
            jsObject.type = "ButtonDashboardWidget";

            if (jsObject.text) {
                if (project.projectTypeTraits.hasFlowSupport) {
                    if (!jsObject.data) {
                        jsObject.data = `"${jsObject.text}"`;
                    }
                    delete jsObject.text;
                }
            }

            migrateStyleProperty(jsObject, "disabledStyle");
        },

        defaultValue: {
            left: 0,
            top: 0,
            width: 80,
            height: 40,
            data: `"Buttton"`,
            eventHandlers: [
                {
                    eventName: "CLICKED",
                    handlerType: "flow"
                }
            ]
        },

        icon: (
            <svg viewBox="0 0 16 16">
                <path
                    fill="currentColor"
                    d="m15.7 5.3-1-1c-.2-.2-.4-.3-.7-.3H1c-.6 0-1 .4-1 1v5c0 .3.1.6.3.7l1 1c.2.2.4.3.7.3h13c.6 0 1-.4 1-1V6c0-.3-.1-.5-.3-.7zM14 10H1V5h13v5z"
                />
            </svg>
        ),

        check: (widget: ButtonDashboardWidget, messages: IMessage[]) => {
            const project = ProjectEditor.getProject(widget);

            if (!project.projectTypeTraits.hasFlowSupport) {
                if (
                    !widget.text &&
                    !widget.data &&
                    !widget.isInputProperty("data")
                ) {
                    messages.push(propertyNotSetMessage(widget, "text"));
                }

                checkObjectReference(widget, "enabled", messages, true);
            } else {
                if (!widget.data) {
                    messages.push(propertyNotSetMessage(widget, "text"));
                }
            }
        },

        execute: (context: IDashboardComponentContext) => {}
    });

    constructor() {
        super();

        makeObservable(this, {
            text: observable,
            enabled: observable,
            disabledStyle: observable
        });
    }

    getClassName() {
        return classNames("eez-widget-component", this.type);
    }

    render(flowContext: IFlowContext, width: number, height: number) {
        const result = getTextValue(
            flowContext,
            this,
            "data",
            undefined,
            this.text
        );
        let text: string;
        let node: React.ReactNode | null;
        if (typeof result == "object") {
            text = result.text;
            node = result.node;
        } else {
            text = result;
            node = null;
        }

        let buttonEnabled = getBooleanValue(
            flowContext,
            this,
            "enabled",
            flowContext.flowState ? !this.enabled : true
        );

        let buttonStyle = buttonEnabled ? this.style : this.disabledStyle;

        const style: React.CSSProperties = {};
        this.styleHook(style, flowContext);

        return (
            <>
                <button
                    className={classNames(buttonStyle.classNames)}
                    style={{ opacity: style.opacity }}
                    disabled={!buttonEnabled}
                    onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (flowContext.projectStore.runtime) {
                            flowContext.projectStore.runtime.executeWidgetAction(
                                flowContext,
                                this,
                                "CLICKED",
                                makeActionParamsValue(flowContext),
                                `struct:${CLICK_EVENT_STRUCT_NAME}`
                            );
                        }
                    }}
                >
                    {node || text}
                </button>

                {super.render(flowContext, width, height)}
            </>
        );
    }
}

registerClass("ButtonDashboardWidget", ButtonDashboardWidget);

////////////////////////////////////////////////////////////////////////////////

const BitmapWidgetPropertyGridUI = observer(
    class BitmapWidgetPropertyGridUI extends React.Component<PropertyProps> {
        get bitmapWidget() {
            return this.props.objects[0] as BitmapDashboardWidget;
        }

        resizeToFitBitmap = () => {
            getProjectStore(this.props.objects[0]).updateObject(
                this.props.objects[0],
                {
                    width: this.bitmapWidget.bitmapObject!.imageElement!.width,
                    height: this.bitmapWidget.bitmapObject!.imageElement!.height
                }
            );
        };

        render() {
            if (this.props.readOnly) {
                return null;
            }

            if (this.props.objects.length > 1) {
                return null;
            }

            const bitmapObject = this.bitmapWidget.bitmapObject;
            if (!bitmapObject) {
                return null;
            }

            const imageElement = bitmapObject.imageElement;
            if (!imageElement) {
                return null;
            }

            const widget = this.props.objects[0] as Widget;

            if (
                widget.width == imageElement.width &&
                widget.height == imageElement.height
            ) {
                return null;
            }

            return (
                <Button
                    color="primary"
                    size="small"
                    onClick={this.resizeToFitBitmap}
                >
                    Resize to Fit Bitmap
                </Button>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

export class BitmapDashboardWidget extends Widget {
    bitmap?: string;

    constructor() {
        super();

        makeObservable(this, {
            bitmap: observable,
            bitmapObject: computed
        });
    }

    get label() {
        return this.bitmap ? `${this.type}: ${this.bitmap}` : this.type;
    }

    static classInfo = makeDerivedClassInfo(Widget.classInfo, {
        enabledInComponentPalette: (projectType: ProjectType) =>
            projectType === ProjectType.DASHBOARD,

        properties: [
            {
                name: "bitmap",
                type: PropertyType.ObjectReference,
                referencedObjectCollectionPath: "bitmaps",
                propertyGridGroup: specificGroup
            },
            {
                name: "customUI",
                type: PropertyType.Any,
                propertyGridGroup: specificGroup,
                computed: true,
                propertyGridRowComponent: BitmapWidgetPropertyGridUI
            }
        ],

        beforeLoadHook: (widget: Widget, jsObject: any, project: Project) => {
            jsObject.type = "BitmapDashboardWidget";
        },

        defaultValue: {
            left: 0,
            top: 0,
            width: 64,
            height: 32
        },

        icon: (
            <svg
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
            >
                <path d="M0 0h24v24H0z" stroke="none" />
                <path d="M15 8h.01" />
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="m4 15 4-4a3 5 0 0 1 3 0l5 5" />
                <path d="m14 14 1-1a3 5 0 0 1 3 0l2 2" />
            </svg>
        ),

        check: (object: BitmapDashboardWidget, messages: IMessage[]) => {
            if (!object.data && !object.bitmap) {
                messages.push(
                    new Message(
                        MessageType.ERROR,
                        "Either bitmap or data must be set",
                        object
                    )
                );
            } else {
                if (object.data && object.bitmap) {
                    messages.push(
                        new Message(
                            MessageType.ERROR,
                            "Both bitmap and data set, only bitmap is used",
                            object
                        )
                    );
                }

                if (object.bitmap) {
                    let bitmap = findBitmap(getProject(object), object.bitmap);
                    if (!bitmap) {
                        messages.push(
                            propertyNotFoundMessage(object, "bitmap")
                        );
                    }
                }
            }
        },

        execute: (context: IDashboardComponentContext) => {}
    });

    get bitmapObject() {
        return this.getBitmapObject(getProjectStore(this).dataContext);
    }

    getBitmapObject(dataContext: IDataContext) {
        return this.bitmap
            ? findBitmap(getProject(this), this.bitmap)
            : this.data
            ? findBitmap(getProject(this), dataContext.get(this.data) as string)
            : undefined;
    }

    getBitmap(flowContext: IFlowContext) {
        if (this.bitmap) {
            return findBitmap(getProject(this), this.bitmap);
        }

        if (this.data) {
            let data;

            if (flowContext.flowState) {
                data = evalProperty(flowContext, this, "data");
            } else {
                data = flowContext.dataContext.get(this.data);
            }

            if (typeof data === "string") {
                if (data.startsWith("data:image/png;base64,")) {
                    return data;
                }

                const bitmap = findBitmap(getProject(this), data as string);
                if (bitmap) {
                    return bitmap;
                }

                return undefined;
            }

            if (data instanceof Uint8Array) {
                const fileType = detectFileType(data);
                return URL.createObjectURL(
                    new Blob([data], { type: fileType.mime } /* (1) */)
                );
            }

            return data;
        }

        return undefined;
    }

    render(flowContext: IFlowContext, width: number, height: number) {
        const bitmap = this.getBitmap(flowContext);

        return (
            <>
                {bitmap ? (
                    bitmap instanceof Bitmap ? (
                        <img src={bitmap.imageSrc} />
                    ) : (
                        <img src={bitmap} />
                    )
                ) : null}

                {super.render(flowContext, width, height)}
            </>
        );
    }
}

registerClass("BitmapDashboardWidget", BitmapDashboardWidget);

////////////////////////////////////////////////////////////////////////////////

import "project-editor/flow/components/widgets/dashboard/eez-chart";
import "project-editor/flow/components/widgets/dashboard/markdown";
import "project-editor/flow/components/widgets/dashboard/plotly";
import "project-editor/flow/components/widgets/dashboard/terminal";