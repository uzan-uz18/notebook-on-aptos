import React, {useEffect, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import {Layout, Row, Col, Button, Spin, List, Checkbox} from "antd";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Aptos } from "@aptos-labs/ts-sdk";
import {
    useWallet,
    InputTransactionData,
} from "@aptos-labs/wallet-adapter-react";


const aptos = new Aptos();

type Task={
    address: string;
    completed: boolean;
    content: string;
    task_id: string;
}

function App() {
    const [accountHasList, setAccountHasList] = useState<boolean>(false);
    // a local state to keep tract whether a transaction is in progress
    const [transactionInProgress, setTransactionInProgress] =
        useState<boolean>(false);
    // Extract the account object from the wallet adapter
    const { account,signAndSubmitTransaction }=useWallet();
    const [tasks, setTasks]=useState<Task[]>([]);

    // add a hook to update the account resource changes
    useEffect(() => {
        fetchList();
    }, [account?.address]);



    const moduleAddress = "0xa85172e8c0f2125ca6b11b2774b45f3c39540c2b799583eb6771ae29c7ef2939";

    const fetchList = async () => {
        if (!account) return [];
        try {
            const todoListResource = await aptos.getAccountResource(
                {
                    accountAddress:account?.address,
                    resourceType: `${moduleAddress}::notebook::TodoList`
                }
            );
            setAccountHasList(true);

            // tasks table handle
            const tableHandle = (todoListResource as any).tasks.handle;
            // tasks table counter
            const taskCounter = (todoListResource as any).task_counter;

            let tasks=[];
            let counter=1;
            while(counter <= taskCounter) {
                const tableItem = {
                    key_type: "u64",
                    value_type: `${moduleAddress}::todolist::Task`,
                    key: `${counter}`,
                };
                const task = await aptos.getTableItem<Task>({handle:tableHandle, data:tableItem});
                tasks.push(task);
                counter++;
            }
            setTasks(tasks);
        } catch (e: any){
            setAccountHasList(false);
        }
    }

    const addNewList = async () => {
        if (!account) return [];
        setTransactionInProgress(true);
        // call the todolist function
        const transaction:InputTransactionData = {
            data: {
                function:`${moduleAddress}::notebook::create_list`,
                functionArguments:[]
            }
        }

        try {
         const response = await signAndSubmitTransaction(transaction);
         // wait for transaction
         await aptos.waitForTransaction({transactionHash:response.hash});
         setAccountHasList(true);
        } catch (e) {
            setAccountHasList(false);
        } finally {
            setTransactionInProgress(false);
        }
    };

    return (
        <>
            <Layout>
                <Row align="middle">
                    <Col span={10} offset={2}>
                        <h1>Our todolist</h1>
                    </Col>
                    <Col span={12} style={{ textAlign: "right", paddingRight: "200px" }}>
                        <WalletSelector />
                    </Col>
                </Row>
            </Layout>
            <Spin spinning = {transactionInProgress}>
                {
                    !accountHasList ? (
                        <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
                            <Col span={8} offset={8}>
                                <Button
                                    disabled={!account}
                                    block
                                    onClick={addNewList}
                                    type="primary"
                                    style={{ height: "40px", backgroundColor: "#3f67ff" }}
                                >
                                    Add new list
                                </Button>
                            </Col>
                        </Row>
                    ) : (
                        <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
                            <Col span={8} offset={8}>
                                {tasks && (
                                    <List
                                        size="small"
                                        bordered
                                        dataSource={tasks}
                                        renderItem={(task: any) => (
                                            <List.Item actions={[<Checkbox />]}>
                                                <List.Item.Meta
                                                    title={task.content}
                                                    description={
                                                        <a
                                                            href={`https://explorer.aptoslabs.com/account/${task.address}/`}
                                                            target="_blank"
                                                        >{`${task.address.slice(0, 6)}...${task.address.slice(-5)}`}</a>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Col>
                        </Row>
                    )
                }
            </Spin>
        </>
    );
}

export default App;
