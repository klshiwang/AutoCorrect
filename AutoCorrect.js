 function myAjax(options) { //自定义一个ajax,方便使用
            return new Promise((resolve, reject) => {
                let opts = options || {};
                opts.type = options.type || "POST";
                opts.success = options.success || function (data) {
                        console.log("返回的数据是:", data);
                        resolve(data);
                    },
                    opts.error = options.error || function (e) {
                        console.log(e)
                        reject(e);
                    }


                $.ajax(opts);
            });
        }


        //批改函数    id_assignIdArray: 包含所有学生答案的id和AssignId对象的数组
        function pigai(id_assignIdArray) {

            let current = 0;
            let timer = setInterval(() => {
                if (current < id_assignIdArray.length) {
                    myAjax({
                        url: "https://www.galayun.com/Admin/WorkAnswer/PiGai", //批改作业请求
                        type: "POST",
                        data: {
                            Id: id_assignIdArray[current].Id,
                            Review: '暂无',
                            Score: Math.floor(Math.random() * (9 - 7 + 1) + 7) * 10, //70,80,90随机数
                            AssignId: id_assignIdArray[current].assignId //AssignId
                        }
                    }).then((value) => {
                        console.log(value)
                    }, reason => {
                        console.log(reason)
                    })
                    console.log(`批改 ${id_assignIdArray.length} 条中的第 ${current+1} 条`);
                    current++;

                } else {
                    clearInterval(timer);
                    console.log('批改完成');
                }
            }, 1000);
        }




        //请求开始

        myAjax({
            url: "https://www.galayun.com/Admin/AssignWork/IndexList", //请求作业列表
            type: "POST",
            data: {
                "page": "1",
                "rows": "100"
            }
        }).then((value) => {
            console.log(value)
            // 获取作业列表
            var homeworkList = value.rows;
            console.log(homeworkList);

            // 筛选作业列表中已经截止的作业
            var doneHomeworkList = []; //已经截止的作业列表
            var nowTime = new Date();
            for (var i in homeworkList) {
                var endTime = new Date(homeworkList[i].EndTime);
                if (endTime.getTime() < nowTime.getTime()) {
                    doneHomeworkList.push(homeworkList[i]);
                }
            }

            // console.log(doneHomeworkList) ; //得到已经截止的作业列表
            //得到已经截止的作业的id
            let HomeworkIdList = [];

            for (let i = 0; i < doneHomeworkList.length; i++) {
                HomeworkIdList.push(doneHomeworkList[i].Id);
            }

            console.log(HomeworkIdList);
            return HomeworkIdList; //已经截止的作业的id

        }).then((value) => {
            console.log("已经截止的作业的id", value);

            let promises = []; //存放返回的所有promise对象
            for (let i = 0; i < value.length; i++) {
                promises.push(myAjax({
					
                    url: "https://www.galayun.com/Admin/AssignWork/CorrectIndexList", //请求指定作业的题目列表 Id=56756
                    type: "POST",
                    data: {
                        "Id": value[i],
                        "page": "1",
                        "rows": "100",
						"Set":1   //自定义的作业要加上这个属性,可能是题库的套数编号 
                    }

                }));
            }
            return Promise.all(promises).then((values) => {
                // console.log(values);  //得到了所有的promise对象返回的数据的数组
                let doubleIdArr = [];
                for (let i = 0; i < values.length; i++) {
                    for (let k = 0; k < values[i].rows.length; k++) {
                        doubleIdArr.push({
                            Id: values[i].rows[k].Id,
                            QuestionId: values[i].rows[k].QuestionId
                        });
                    }
                }
                console.log('doubleIdArr:',doubleIdArr); //得到所有的Id 和QuestionId
                return doubleIdArr; //返回所有的Id 和QuestionId
            });

        }).then((value) => {
            // console.log("3",value)  //所有的Id 和QuestionId
            let answerPromises = [];
            for (let i = 0; i < value.length; i++) { //发出所有包含Id和和QuestionId的请求,并把返回的promise存在数组中
                answerPromises.push(new Promise((resolve, reject) => {
                    $.ajax({
                        url: "https://www.galayun.com/Admin/WorkAnswer/list", //  请求指定作业(Id)的指定题(Qid)  Id=56756&Qid=1750 
                        type: "POST",
                        data: {
                            "Id": value[i].Id,
                            "Qid": value[i].QuestionId,
                            "page": "1",
                            "rows": "100"
                        },
                        success: function (data) {
                            //把assignId加入到数据中, 以便后面容易取到它
                            for (let k = 0; k < data.rows.length; k++) {
                                data.rows[k].assignId = value[i].Id
                            }
                            resolve(data);
                        },
                        error: function (e) {
                            reject(e);
                        }

                    })
                }));
            }

            Promise.all(answerPromises).then((values) => {
                console.log("4", values);
                let answerDoubleIds = []; //存放每个答案的Id
                for (let i = 0; i < values.length; i++) {
                    for (let k = 0; k < values[i].rows.length; k++) {
                        answerDoubleIds.push({
                            Id: values[i].rows[k].Id,
                            assignId: values[i].rows[k].assignId
                        });
                    }

                }
                console.log(answerDoubleIds);
                pigai(answerDoubleIds);  //调用批改函数,静等结果吧
            });

        });