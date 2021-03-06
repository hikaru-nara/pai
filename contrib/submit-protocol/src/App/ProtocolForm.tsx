// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
// BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import React, { Suspense, lazy } from "react";
import { initializeIcons } from "office-ui-fabric-react/lib/Icons";
import { Fabric } from "office-ui-fabric-react/lib/Fabric";
import { Label } from "office-ui-fabric-react/lib/Label";
import { List } from "office-ui-fabric-react/lib/List";
import { Toggle } from "office-ui-fabric-react/lib/Toggle";
import { TextField } from "office-ui-fabric-react/lib/TextField";
import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel";
import { Spinner, SpinnerSize } from "office-ui-fabric-react/lib/Spinner";
import { DefaultButton, PrimaryButton } from "office-ui-fabric-react/lib/Button";
import classNames from "classnames";
import update from "immutability-helper";
import yaml from "yaml";

import bootstrapStyles from "bootstrap/dist/css/bootstrap.min.css";
import monacoStyles from "./monaco.scss";

const MonacoEditor = lazy(() => import("react-monaco-editor"));

initializeIcons();

interface IParameterObj {
  [key: string]: string;
}

interface IParameterItem {
  key: string;
  value: string;
}

interface IProtocolProps {
  api: string;
  user: string;
  token: string;
  source ?: {
    jobName: string;
    user: string;
  };
}

interface IProtocolState {
  jobName: string;
  protocol: any;
  protocolYAML: string;
  loading: boolean;
  showParameters: boolean;
  showEditor: boolean;
}

export default class ProtocolForm extends React.Component<IProtocolProps, IProtocolState> {
  public state = {
    jobName: "",
    protocol: Object.create(null),
    protocolYAML: "",
    loading: true,
    showParameters: false,
    showEditor: false,
  };

  public componentDidMount() {
    this.fetchConfig();
  }

  public render() {
    return this.state.loading ?
    this.renderLoading() :
    this.readerContent();
  }

  private renderLoading = () => {
    return (
      <Fabric>
        <div className={bootstrapStyles.container}>
          <div className={bootstrapStyles.modalDialog}>
            <div className={bootstrapStyles.modalContent}>
              <div className={bootstrapStyles.modalHeader}>
                <h3 className={bootstrapStyles.modalTitle}>
                  Submit Job v2 <small>Protocol Preview</small>
                </h3>
              </div>
              <div className={classNames(bootstrapStyles.modalBody, bootstrapStyles.row)}>
                <Spinner size={SpinnerSize.large} />
              </div>
            </div>
          </div>
        </div>
      </Fabric>
    );
  }

  private readerContent = () => {
    const editorSpinner = (
      <Spinner
        label="Loading YAML Editor ..."
        ariaLive="assertive"
        labelPosition="left"
        size={SpinnerSize.large}
      />
    );

    return (
      <Fabric>
        <Panel
          isOpen={this.state.showEditor}
          isLightDismiss={true}
          onDismiss={this.closeEditor}
          type={PanelType.largeFixed}
          headerText="Protocol YAML Editor"
        >
          <div className={monacoStyles.monacoHack}>
            <Suspense fallback={editorSpinner}>
              <MonacoEditor
                width={800}
                height={800}
                value={this.state.protocolYAML}
                onChange={this.editProtocol}
                language="yaml"
                theme="vs-dark"
                options={{ wordWrap: "on", readOnly: false }}
              />
            </Suspense>
          </div>
          <div style={{ marginTop: "15px" }}>
            <PrimaryButton text="Save" onClick={this.saveEditor} style={{ marginRight: "10px" }}/>
            <DefaultButton text="Discard" onClick={this.discardEditor} />
          </div>
        </Panel>

        <div className={bootstrapStyles.container}>
          <div className={bootstrapStyles.modalDialog}>
            <div className={bootstrapStyles.modalContent}>
              <div className={bootstrapStyles.modalHeader}>
                <h3 className={bootstrapStyles.modalTitle}>
                  Submit Job v2 <small>Protocol Preview</small>
                </h3>
              </div>
              <div className={classNames(bootstrapStyles.modalBody, bootstrapStyles.row)}>
                <div className={classNames(bootstrapStyles.formGroup, bootstrapStyles.colMd8)}>
                  <TextField
                    label="Job Name "
                    value={this.state.jobName}
                    onChange={this.setJobName}
                    required={true}
                  />
                </div>
                <div className={classNames(bootstrapStyles.formGroup, bootstrapStyles.colMd8)}>
                  <Toggle
                    label="Job Parameters "
                    checked={this.state.showParameters}
                    onChange={this.toggleParameters}
                    inlineLabel={true}
                  />
                  {this.renderParameters()}
                </div>
                <div className={classNames(bootstrapStyles.formGroup, bootstrapStyles.colMd8)}>
                  <Label>Protocol YAML Operation</Label>
                  <label className={bootstrapStyles.colMd3} style={{padding: 0}}>
                    <a className={classNames(bootstrapStyles.btn, bootstrapStyles.btnSuccess)}>Import</a>
                    <input
                      type="file"
                      className={bootstrapStyles.srOnly}
                      accept=".yml,.yaml"
                      onChange={this.importFile}
                    />
                  </label>
                  <DefaultButton text="View/Edit" onClick={this.openEditor} />
                </div>
              </div>
              <div className={bootstrapStyles.modalFooter} style={{ marginTop: "150px" }}>
                <PrimaryButton text="Submit Job" onClick={this.submitProtocol} />
              </div>
            </div>
          </div>
        </div>
      </Fabric>
    );
  }

  private fetchConfig = () => {
    const source = this.props.source;
    if (source && source.jobName && source.user) {
      fetch(
        `${this.props.api}/api/v1/user/${source.user}/jobs/${source.jobName}/config`,
      ).then((res) => {
        return res.json();
      }).then((body) => {
        const protocol = yaml.parse(body);
        this.setState(
          { protocol },
          () => this.setJobName(
            null as any,
            `${source.jobName}_clone_${Math.random().toString(36).slice(2, 10)}`,
          ),
        );
      }).catch((err) => {
        alert(err.message);
      }).finally(() => {
        this.setState({ loading: false });
      });
    } else {
      this.setState({ loading: false });
    }
  }

  private setJobName = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, jobName?: string) => {
    if (jobName !== undefined) {
      const protocol = update(this.state.protocol, {
        name: { $set: jobName },
      });
      this.setState({
        jobName,
        protocol,
        protocolYAML: yaml.stringify(protocol),
      });
    }
  }

  private importFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const files = event.target.files;
    if (!files || !files[0]) {
      return;
    }
    const fileReader = new FileReader();
    fileReader.addEventListener("load", () => {
      const text = fileReader.result as string;
      try {
        const protocol = yaml.parse(text);
        this.setState({
          jobName: protocol.name || "",
          protocol,
          protocolYAML: text,
        });
      } catch (err) {
        alert(err.message);
      }
    });
    fileReader.readAsText(files[0]);
  }

  private getParameterItems = () => {
    const pairs: IParameterItem[] = [];
    const parameters = this.state.protocol.parameters as object;
    if (parameters) {
      Object.entries(parameters).forEach(
        ([key, value]) => pairs.push({key, value}),
      );
    }
    return pairs;
  }

  private renderParameterItems = (item?: IParameterItem) => {
    if (item !== undefined) {
      const setParameter = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, value?: string) => {
        if (value !== undefined) {
          const protocol = this.state.protocol;
          (protocol.parameters as IParameterObj)[item.key] = value;
          this.setState({
            protocol,
            protocolYAML: yaml.stringify(protocol),
          });
        }
      };

      return (
        <TextField
          label={`${item.key}: `}
          defaultValue={item.value}
          onChange={setParameter}
          underlined={true}
        />
      );
    } else {
      return (null);
    }
  }

  private toggleParameters = (event: React.MouseEvent<HTMLElement, MouseEvent>, checked?: boolean) => {
    if (checked !== undefined) {
      this.setState({ showParameters: checked });
    }
  }

  private renderParameters = () => {
    if (this.state.showParameters) {
      const items = this.getParameterItems();
      if (items.length > 0) {
        return (
          <List
            items={this.getParameterItems()}
            onRenderCell={this.renderParameterItems}
          />
        );
      } else {
        return (
          <Label>There is no parameter to show.</Label>
        );
      }
    } else {
      return (null);
    }
  }

  private editProtocol = (text: string) => {
    this.setState({ protocolYAML: text });
  }

  private openEditor = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    this.setState({ showEditor: true });
  }

  private closeEditor = () => {
    this.setState({ showEditor: false });
  }

  private saveEditor = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    const text = this.state.protocolYAML;
    try {
      const protocol = yaml.parse(text);
      this.setState({
        jobName: protocol.name || "",
        protocol,
        showEditor: false,
      });
    } catch (err) {
      alert(err.message);
    }
  }

  private discardEditor = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    const text = yaml.stringify(this.state.protocol);
    this.setState({
      protocolYAML: text,
      showEditor: false,
    });
  }

  private submitProtocol = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    if (this.state.protocolYAML == null) {
      return;
    }
    fetch(`${this.props.api}/api/v2/jobs`, {
      body: this.state.protocolYAML,
      headers: {
        "Authorization": `Bearer ${this.props.token}`,
        "Content-Type": "text/yaml",
      },
      method: "POST",
    }).then((res) => {
      return res.json();
    }).then((body) => {
      if (Number(body.status) >= 400) {
        alert(body.message);
      } else {
        window.location.href = `/job-detail.html?username=${this.props.user}&jobName=${this.state.jobName}`;
      }
    }).catch((err) => {
      alert(err.message);
    });
  }
}
